/**
 * 管理员判定
 *
 * 两个层级：
 * - root：由 NEXT_PUBLIC_ROOT_USER_EMAIL 指定的唯一账号，权限最高（系统配置、用户管理）
 * - 内容管理员（user.is_admin）：可进后台看统计、管理游戏，且不受 Token 限制；由 root 在用户管理里授予
 *
 * root 用 NEXT_PUBLIC_ 前缀是刻意的：服务端与客户端读同一个值，绝不会出现
 * 「前端显示了后台入口、后端不放行」（或反过来）的分歧。
 * 该变量在**构建期**被内联进产物（服务端与客户端都一样），改它必须重新构建部署，
 * 放在 wrangler 的 vars 里是无效的。
 *
 * 真实校验一律在 API 路由内进行，前端标记只用于隐藏入口。
 */

import { getCloudflareContext } from '@opennextjs/cloudflare';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '@/db/schema';

export function isRootUser(userEmail: string | null | undefined): boolean {
  if (!userEmail) return false;
  const rootEmail = process.env.NEXT_PUBLIC_ROOT_USER_EMAIL?.trim().toLowerCase();
  return Boolean(rootEmail) && rootEmail === userEmail.trim().toLowerCase();
}

export interface AdminCandidate {
  email: string;
  isAdmin?: boolean | null;
}

/** 内容管理员：root 或标记了 is_admin 的用户 */
export function isAdminUser(user: AdminCandidate | null | undefined): boolean {
  if (!user) return false;
  return isRootUser(user.email) || user.isAdmin === true;
}

/**
 * 按用户 ID 判定管理员（root 或 is_admin）。
 * 供只有 userId、拿不到 session 的场景（用量限制、配额快照）使用。
 */
export async function isAdminUserId(userId: string): Promise<boolean> {
  try {
    const { env } = getCloudflareContext();
    const db = drizzle(env.DB);
    const rows = await db
      .select({ email: schema.user.email, isAdmin: schema.user.isAdmin })
      .from(schema.user)
      .where(eq(schema.user.id, userId))
      .limit(1);

    return isAdminUser(rows[0]);
  } catch (error) {
    console.error('[Admin] 判定管理员失败:', error);
    return false;
  }
}
