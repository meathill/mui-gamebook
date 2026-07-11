/**
 * 游戏访问控制
 * 游戏所有者或 root 管理员可管理（查看/编辑/生成）游戏
 */

import { eq } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from '@/db/schema';
import { isRootUser } from './config';

export interface SessionLike {
  user: { id: string; email: string };
}

export function canManageGame(session: SessionLike, game: { ownerId: string | null }): boolean {
  return game.ownerId === session.user.id || isRootUser(session.user.email);
}

/**
 * 按 id 加载游戏并校验管理权限，无权或不存在返回 null
 */
export async function getManagedGame(db: DrizzleD1Database, gameId: number, session: SessionLike) {
  const game = await db.select().from(schema.games).where(eq(schema.games.id, gameId)).get();
  if (!game || !canManageGame(session, game)) {
    return null;
  }
  return game;
}
