/**
 * MCP Agent 工具执行：CRUD + AI 生成。
 * 鉴权后的调用上下文由 route 注入；此处不直接读 cookie。
 */
import { parse, stringify } from '@mui-gamebook/parser';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { desc, eq, sql } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { drizzle } from 'drizzle-orm/d1';
import slugify from 'slugify';
import * as schema from '@/db/schema';
import { isAdminUser } from '@/lib/admin';
import { getUserAiPermissions, resolveTextProvider } from '@/lib/ai-permissions';
import { createAiProvider } from '@/lib/ai-provider-factory';
import { recordAiUsage } from '@/lib/ai-usage';
import { getConfig } from '@/lib/config';
import {
  buildCorrectionPrompt,
  buildGenerateScriptPrompt,
  buildReviseScriptPrompt,
  hasSubstantialScript,
  stripCodeFence,
  trimDslSpecForFirstPass,
  validateGeneratedScript,
} from '@/lib/editor/generate-script';
import { generateAndUploadImage } from '@/lib/ai-service';
import { canManageGame } from '@/lib/game-access';
import { revalidatePublicCatalog } from '@/lib/public-cache';
import { checkUserUsageLimit } from '@/lib/usage-limit';

export interface McpActor {
  mode: 'admin' | 'session';
  /** 计费与用量归属用户；admin 模式解析为 root/首个用户 */
  user: { id: string; email: string };
}

export interface McpToolOutcome {
  ok: boolean;
  message: string;
  data?: Record<string, unknown>;
}

function ok(message: string, data?: Record<string, unknown>): McpToolOutcome {
  return { ok: true, message, data };
}

function fail(message: string): McpToolOutcome {
  return { ok: false, message };
}

export function getDb(): DrizzleD1Database<typeof schema> {
  const { env } = getCloudflareContext();
  return drizzle(env.DB);
}

export async function resolveMcpActorUser(
  db: DrizzleD1Database<typeof schema>,
  mode: 'admin' | 'session',
  sessionUser?: { id: string; email: string },
): Promise<McpActor | null> {
  if (mode === 'session' && sessionUser?.id && sessionUser.email) {
    return { mode, user: sessionUser };
  }
  const rootEmail = process.env.NEXT_PUBLIC_ROOT_USER_EMAIL?.trim();
  if (rootEmail) {
    const row = await db
      .select()
      .from(schema.user)
      .where(eq(sql`LOWER(${schema.user.email})`, rootEmail.toLowerCase()))
      .get();
    if (row?.id && row.email) return { mode: 'admin', user: { id: row.id, email: row.email } };
  }
  const first = await db.select().from(schema.user).limit(1);
  const user = first[0];
  if (user?.id && user.email) return { mode: 'admin', user: { id: user.id, email: user.email } };
  return null;
}

async function loadManagedGame(db: DrizzleD1Database<typeof schema>, gameId: number, actor: McpActor) {
  const game = await db.select().from(schema.games).where(eq(schema.games.id, gameId)).get();
  if (!game) return { error: fail(`游戏不存在: ${gameId}`) as McpToolOutcome };
  if (actor.mode === 'session' && !canManageGame({ user: actor.user }, game)) {
    return { error: fail('无权操作该游戏') as McpToolOutcome };
  }
  return { game };
}

async function writeGameContent(
  db: DrizzleD1Database<typeof schema>,
  game: { id: number; slug: string },
  nextDsl: string,
) {
  const revalidate = parse(nextDsl);
  if (!revalidate.success) return fail(`DSL 校验失败: ${revalidate.error}`);
  const { title, description, backgroundStory, cover_image, tags, published } = revalidate.data;
  await db
    .update(schema.games)
    .set({
      title,
      description,
      backgroundStory,
      coverImage: cover_image,
      tags: JSON.stringify(tags),
      published,
      updatedAt: new Date(),
    })
    .where(eq(schema.games.id, game.id));
  await db.update(schema.gameContent).set({ content: nextDsl }).where(eq(schema.gameContent.gameId, game.id));
  revalidatePublicCatalog({ slug: game.slug, tags });
  return ok('剧本已更新', { gameId: game.id, slug: game.slug });
}

async function fetchDslSpec(): Promise<string> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://muistory.com';
  const res = await fetch(`${base.replace(/\/$/, '')}/DSL_SPEC.md`);
  if (!res.ok) throw new Error(`拉取 DSL_SPEC 失败: ${res.status}`);
  return res.text();
}

async function runTextGeneration(
  prompt: string,
  providerType: string,
): Promise<{
  text: string;
  model: string;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
}> {
  const provider = await createAiProvider(providerType as Parameters<typeof createAiProvider>[0]);
  const config = await getConfig();
  const modelMap: Record<string, string> = {
    opencode: config.opencodeTextModel,
    google: config.googleTextModel,
    openai: config.openaiTextModel,
    mimo: config.mimoTextModel,
    anthropic: config.anthropicTextModel,
  };
  const model = modelMap[providerType] || providerType;

  if (provider.generateTextStream) {
    let text = '';
    const gen = provider.generateTextStream(prompt, { thinking: true });
    let result = await gen.next();
    while (!result.done) {
      if (result.value.type === 'content') text += result.value.delta;
      result = await gen.next();
    }
    return {
      text: result.value.text || text,
      model,
      usage: result.value.usage,
    };
  }
  const result = await provider.generateText(prompt, { thinking: true });
  return {
    text: result.text,
    model,
    usage: result.usage,
  };
}

export async function executeMcpAgentTool(
  toolName: string,
  args: Record<string, unknown>,
  actor: McpActor,
): Promise<McpToolOutcome> {
  const db = getDb();

  if (toolName === 'listGames') {
    const limit = Math.min(Number(args.limit) || 50, 200);
    const rows =
      actor.mode === 'admin'
        ? await db.select().from(schema.games).orderBy(desc(schema.games.updatedAt)).limit(limit)
        : await db
            .select()
            .from(schema.games)
            .where(eq(schema.games.ownerId, actor.user.id))
            .orderBy(desc(schema.games.updatedAt))
            .limit(limit);
    return ok(`共 ${rows.length} 款游戏`, {
      games: rows.map((g) => ({
        id: g.id,
        slug: g.slug,
        title: g.title,
        published: Boolean(g.published),
        ownerId: g.ownerId,
        updatedAt: g.updatedAt,
      })),
    });
  }

  const gameId = Number(args.gameId);
  if (toolName !== 'createGame' && !gameId) return fail('缺少 gameId');

  if (toolName === 'createGame') {
    const title = String(args.title || '').trim();
    if (!title) return fail('缺少 title');
    let ownerId = typeof args.ownerId === 'string' && args.ownerId ? args.ownerId : actor.user.id;
    if (actor.mode === 'admin' && args.ownerId) {
      const target = await db
        .select()
        .from(schema.user)
        .where(eq(schema.user.id, String(args.ownerId)))
        .get();
      if (!target) return fail(`ownerId 用户不存在: ${String(args.ownerId)}`);
      ownerId = target.id;
    }
    const customSlug = typeof args.slug === 'string' ? args.slug.trim() : '';
    if (customSlug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(customSlug)) {
      return fail('slug 仅允许小写字母/数字/连字符');
    }
    if (customSlug) {
      const existing = await db.select().from(schema.games).where(eq(schema.games.slug, customSlug)).get();
      if (existing) return fail(`slug 已被占用: ${customSlug}`);
    }
    const slug = customSlug || `${slugify(title, { lower: true, strict: true })}-${Date.now().toString().slice(-4)}`;
    const content =
      typeof args.content === 'string' && args.content.trim()
        ? args.content
        : `---\ntitle: "${title.replace(/"/g, '\\"')}"\ndescription: "${String(args.description || 'New game description').replace(/"/g, '\\"')}"\npublished: false\n---\n\n# start\n欢迎来到新游戏！\n`;
    const parsed = parse(content);
    if (!parsed.success) return fail(`初始 DSL 非法: ${parsed.error}`);
    const now = new Date();
    const result = await db
      .insert(schema.games)
      .values({
        slug,
        title,
        description: typeof args.description === 'string' ? args.description : parsed.data.description,
        ownerId,
        createdAt: now,
        updatedAt: now,
        published: false,
      })
      .returning();
    const id = result[0].id;
    await db.insert(schema.gameContent).values({ gameId: id, content });
    return ok(`已创建游戏 ${title}`, { id, slug, title });
  }

  const loaded = await loadManagedGame(db, gameId, actor);
  if (loaded.error) return loaded.error;
  const game = loaded.game;
  if (!game) return fail(`游戏不存在: ${gameId}`);

  if (toolName === 'getGameInfo') {
    const content = await db.select().from(schema.gameContent).where(eq(schema.gameContent.gameId, gameId)).get();
    const parsed = parse(content?.content || '');
    if (!parsed.success) return fail(`剧本解析失败: ${parsed.error}`);
    return ok(`《${game.title}》(${game.slug})`, {
      id: game.id,
      slug: game.slug,
      title: game.title,
      description: game.description,
      backgroundStory: game.backgroundStory,
      coverImage: game.coverImage,
      tags: game.tags ? (JSON.parse(game.tags) as string[]) : [],
      published: Boolean(game.published),
      ownerId: game.ownerId,
      sceneIds: Object.keys(parsed.data.scenes),
      sceneCount: Object.keys(parsed.data.scenes).length,
      characters: Object.keys(parsed.data.ai?.characters ?? {}),
      variables: Object.keys(parsed.data.initialState ?? {}),
    });
  }

  if (toolName === 'updateGameMeta') {
    const tags = Array.isArray(args.tags) ? (args.tags as string[]) : undefined;
    let nextSlug = game.slug;
    if (typeof args.slug === 'string' && args.slug.trim()) {
      nextSlug = args.slug.trim();
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(nextSlug)) {
        return fail('slug 仅允许小写字母/数字/连字符');
      }
      if (nextSlug !== game.slug) {
        const existing = await db.select().from(schema.games).where(eq(schema.games.slug, nextSlug)).get();
        if (existing) return fail(`slug 已被占用: ${nextSlug}`);
      }
    }
    await db
      .update(schema.games)
      .set({
        ...(nextSlug !== game.slug ? { slug: nextSlug } : {}),
        ...(typeof args.title === 'string' ? { title: args.title } : {}),
        ...(typeof args.description === 'string' ? { description: args.description } : {}),
        ...(typeof args.backgroundStory === 'string' ? { backgroundStory: args.backgroundStory } : {}),
        ...(typeof args.coverImage === 'string' ? { coverImage: args.coverImage } : {}),
        ...(tags ? { tags: JSON.stringify(tags) } : {}),
        ...(typeof args.published === 'boolean' ? { published: args.published } : {}),
        updatedAt: new Date(),
      })
      .where(eq(schema.games.id, gameId));
    if (typeof args.published === 'boolean' || tags || nextSlug !== game.slug) {
      revalidatePublicCatalog({
        slug: nextSlug,
        tags: tags ?? (game.tags ? (JSON.parse(game.tags) as string[]) : []),
      });
      if (nextSlug !== game.slug) revalidatePublicCatalog({ slug: game.slug });
    }
    return ok('元数据已更新', { gameId, slug: nextSlug });
  }

  if (toolName === 'setGameDsl') {
    const content = String(args.content || '');
    if (!content.trim()) return fail('缺少 content');
    const dryRun = args.dryRun === true;
    const parsed = parse(content);
    if (!parsed.success) return fail(`DSL 校验失败: ${parsed.error}`);
    if (dryRun) return ok('dryRun 校验通过，未写库', { dsl: stringify(parsed.data) });
    return writeGameContent(db, game, stringify(parsed.data));
  }

  if (toolName === 'generateScript') {
    const story = String(args.story || '').trim();
    if (!story) return fail('缺少 story');
    const usageCheck = await checkUserUsageLimit(actor.user.id);
    if (!usageCheck.allowed) return fail(usageCheck.message || '今日 AI 额度已用尽');
    const permissions = await getUserAiPermissions(actor.user);
    const providerType = resolveTextProvider(
      permissions,
      typeof args.provider === 'string' ? args.provider : undefined,
    );
    const contentRec = await db.select().from(schema.gameContent).where(eq(schema.gameContent.gameId, gameId)).get();
    const existing = contentRec?.content || '';
    const existingParsed = parse(existing);
    const useExisting =
      args.useExisting === true ||
      (args.useExisting !== false && existingParsed.success && hasSubstantialScript(existingParsed.data));

    let dslSpec: string;
    try {
      dslSpec = trimDslSpecForFirstPass(await fetchDslSpec());
    } catch {
      dslSpec = '';
    }
    const prompt =
      useExisting && existing
        ? buildReviseScriptPrompt(dslSpec, existing, story)
        : buildGenerateScriptPrompt(dslSpec, story);
    const first = await runTextGeneration(prompt, providerType);
    let script = stripCodeFence(first.text);
    const totalUsage = { ...first.usage };
    let model = first.model;

    const validation = validateGeneratedScript(script);
    if (!validation.ok) {
      const corrected = await runTextGeneration(buildCorrectionPrompt(script, validation), providerType);
      totalUsage.promptTokens += corrected.usage.promptTokens;
      totalUsage.completionTokens += corrected.usage.completionTokens;
      totalUsage.totalTokens += corrected.usage.totalTokens;
      model = corrected.model;
      const reval = validateGeneratedScript(stripCodeFence(corrected.text));
      if (!reval.parseError) script = stripCodeFence(corrected.text);
    }

    await recordAiUsage({
      userId: actor.user.id,
      type: 'text_generation',
      model,
      usage: totalUsage,
      gameId,
    });

    if (args.dryRun === true) {
      return ok('已生成剧本（dryRun 未写库）', { script, model, usage: totalUsage });
    }
    const writeResult = await writeGameContent(db, game, script);
    return { ...writeResult, data: { ...(writeResult.data || {}), script, model, usage: totalUsage } };
  }

  if (toolName === 'generateImage') {
    const prompt = String(args.prompt || '').trim();
    if (!prompt) return fail('缺少 prompt');
    const usageCheck = await checkUserUsageLimit(actor.user.id);
    if (!usageCheck.allowed) return fail(usageCheck.message || '今日 AI 额度已用尽');
    const permissions = await getUserAiPermissions(actor.user);
    if (!permissions.canGenerateImage) {
      return fail('当前用户没有图片生成权限');
    }
    const fileName = `images/${gameId}/${Date.now()}.png`;
    const { url, usage, model } = await generateAndUploadImage(prompt, fileName, {
      aspectRatio: typeof args.aspectRatio === 'string' ? args.aspectRatio : undefined,
    });
    await recordAiUsage({
      userId: actor.user.id,
      type: 'image_generation',
      model,
      usage,
      gameId,
    });
    return ok('图片已生成', { url, model, usage });
  }

  if (toolName === 'uploadAsset') {
    const raw = String(args.data || '').trim();
    if (!raw) return fail('缺少 data');
    let bytes: Uint8Array;
    let contentType = typeof args.contentType === 'string' ? args.contentType : '';
    if (raw.startsWith('data:')) {
      const match = raw.match(/^data:([^;,]+)?(;base64)?,([\s\S]*)$/);
      if (!match) return fail('data URL 格式无效');
      if (match[1]) contentType = contentType || match[1];
      bytes = match[2]
        ? Uint8Array.from(atob(match[3]), (c) => c.charCodeAt(0))
        : new TextEncoder().encode(decodeURIComponent(match[3]));
    } else {
      if (!contentType) return fail('裸 base64 时必须提供 contentType');
      bytes = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
    }
    if (bytes.byteLength > 8 * 1024 * 1024) return fail('素材过大（上限 8MB）');

    const { env } = getCloudflareContext();
    const bucket = env.ASSETS_BUCKET;
    if (!bucket) return fail("R2 Bucket 'ASSETS_BUCKET' not found");

    const extFromName = typeof args.fileName === 'string' ? args.fileName.split('.').pop() || '' : '';
    const extFromMime = (contentType.split('/')[1] || '').replace(/\+.*/, '');
    const ext = (extFromName || extFromMime || 'bin').toLowerCase();
    const kind = typeof args.type === 'string' ? args.type : 'scene';
    const characterId = typeof args.characterId === 'string' ? args.characterId : '';
    const stamp = Date.now();
    let key: string;
    switch (kind) {
      case 'character':
        key = `images/${game.slug}/characters/${characterId || 'unknown'}-${stamp}.${ext}`;
        break;
      case 'cover':
        key = `images/${game.slug}/cover-${stamp}.${ext}`;
        break;
      case 'chat':
        key = `images/${game.slug}/chat-${stamp}.${ext}`;
        break;
      case 'audio':
        key = `audio/${game.slug}/${stamp}.${ext}`;
        break;
      case 'video':
        key = `video/${game.slug}/${stamp}.${ext}`;
        break;
      default:
        key = `images/${game.slug}/scenes/${stamp}.${ext}`;
        break;
    }
    await bucket.put(key, bytes, {
      httpMetadata: {
        contentType: contentType || 'application/octet-stream',
        cacheControl: 'public, max-age=31536000, immutable',
      },
    });
    const publicDomain = env.ASSETS_PUBLIC_DOMAIN || process.env.ASSETS_PUBLIC_DOMAIN;
    const url = publicDomain ? `${publicDomain}/${key}` : `R2://${key}`;
    return ok('素材已上传', { url, key, contentType, bytes: bytes.byteLength });
  }

  if (toolName === 'deleteGame') {
    if (args.confirm !== true) return fail('删除需 confirm: true');
    await db.delete(schema.gameContent).where(eq(schema.gameContent.gameId, gameId));
    await db.delete(schema.games).where(eq(schema.games.id, gameId));
    revalidatePublicCatalog({ slug: game.slug, tags: [] });
    return ok(`已删除游戏 ${game.title}`, { gameId, slug: game.slug });
  }

  return fail(`未知 Agent 工具: ${toolName}`);
}
