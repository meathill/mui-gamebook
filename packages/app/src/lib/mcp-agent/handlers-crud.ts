/**
 * MCP Agent 工具：游戏 CRUD（listGames/createGame/getGameInfo/updateGameMeta/setGameDsl/deleteGame）
 */
import { parse, stringify } from '@mui-gamebook/parser';
import { desc, eq } from 'drizzle-orm';
import slugify from 'slugify';
import * as schema from '@/db/schema';
import { revalidatePublicCatalog } from '@/lib/public-cache';
import { type McpGameContext, type McpToolContext, type McpToolOutcome, fail, ok, writeGameContent } from './shared';

export async function handleListGames(
  { db, actor }: McpToolContext,
  args: Record<string, unknown>,
): Promise<McpToolOutcome> {
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

export async function handleCreateGame(
  { db, actor }: McpToolContext,
  args: Record<string, unknown>,
): Promise<McpToolOutcome> {
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

export async function handleGetGameInfo({ db, gameId, game }: McpGameContext): Promise<McpToolOutcome> {
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

export async function handleUpdateGameMeta(
  { db, gameId, game }: McpGameContext,
  args: Record<string, unknown>,
): Promise<McpToolOutcome> {
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

export async function handleSetGameDsl(
  { db, game }: McpGameContext,
  args: Record<string, unknown>,
): Promise<McpToolOutcome> {
  const content = String(args.content || '');
  if (!content.trim()) return fail('缺少 content');
  const dryRun = args.dryRun === true;
  const parsed = parse(content);
  if (!parsed.success) return fail(`DSL 校验失败: ${parsed.error}`);
  if (dryRun) return ok('dryRun 校验通过，未写库', { dsl: stringify(parsed.data) });
  return writeGameContent(db, game, stringify(parsed.data));
}

export async function handleDeleteGame(
  { db, gameId, game }: McpGameContext,
  args: Record<string, unknown>,
): Promise<McpToolOutcome> {
  if (args.confirm !== true) return fail('删除需 confirm: true');
  await db.delete(schema.gameContent).where(eq(schema.gameContent.gameId, gameId));
  await db.delete(schema.games).where(eq(schema.games.id, gameId));
  revalidatePublicCatalog({ slug: game.slug, tags: [] });
  return ok(`已删除游戏 ${game.title}`, { gameId, slug: game.slug });
}
