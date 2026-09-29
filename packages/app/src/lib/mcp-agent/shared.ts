/**
 * MCP Agent 工具的公共构件：类型、鉴权后 actor 解析、游戏加载与剧本写回。
 * 鉴权后的调用上下文由 route 注入；此处不直接读 cookie。
 */
import { parse } from '@mui-gamebook/parser';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { eq, sql } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '@/db/schema';
import { canManageGame } from '@/lib/game-access';
import { revalidatePublicCatalog } from '@/lib/public-cache';

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

/** schema.games 行类型（drizzle inferSelect） */
export type McpGameRow = typeof schema.games.$inferSelect;

/** 只需要 db 与 actor 的工具（listGames/createGame） */
export interface McpToolContext {
  db: DrizzleD1Database<typeof schema>;
  actor: McpActor;
}

/** 已解析并校验过归属权的单游戏工具 */
export interface McpGameContext extends McpToolContext {
  gameId: number;
  game: McpGameRow;
}

export function ok(message: string, data?: Record<string, unknown>): McpToolOutcome {
  return { ok: true, message, data };
}

export function fail(message: string): McpToolOutcome {
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

export async function loadManagedGame(db: DrizzleD1Database<typeof schema>, gameId: number, actor: McpActor) {
  const game = await db.select().from(schema.games).where(eq(schema.games.id, gameId)).get();
  if (!game) return { error: fail(`游戏不存在: ${gameId}`) as McpToolOutcome };
  if (actor.mode === 'session' && !canManageGame({ user: actor.user }, game)) {
    return { error: fail('无权操作该游戏') as McpToolOutcome };
  }
  return { game };
}

export async function writeGameContent(
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
