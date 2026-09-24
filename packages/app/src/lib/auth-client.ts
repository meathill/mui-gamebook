import { createAuthClient } from 'better-auth/react';
import { apiKeyClient } from '@better-auth/api-key/client';

export const authClient = createAuthClient({
  plugins: [apiKeyClient()],
});

/**
 * 客户端判定 root（最高权限）管理员。
 *
 * 与服务端 `@/lib/admin` 读的是**同一个** `NEXT_PUBLIC_ROOT_USER_EMAIL`，
 * 构建期内联后两侧值必然一致，不会出现前后端判定分歧。
 *
 * 内容管理员（`user.is_admin`）由 session.user.isAdmin 标记，见 isAdminSession。
 */
export function isRootUserClient(email: string | undefined): boolean {
  if (!email) return false;
  const rootEmail = process.env.NEXT_PUBLIC_ROOT_USER_EMAIL?.trim().toLowerCase();
  return Boolean(rootEmail) && rootEmail === email.trim().toLowerCase();
}

/** 客户端判定是否可进后台（root 或内容管理员） */
export function isAdminSession(user: { email?: string; isAdmin?: boolean | null } | undefined | null): boolean {
  if (!user) return false;
  return user.isAdmin === true || isRootUserClient(user.email);
}
