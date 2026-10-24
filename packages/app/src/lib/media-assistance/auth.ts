import { isAdminUser } from '@/lib/admin';
import { AssistanceError } from './types';

export async function requireAssistanceAdmin(db: D1Database, mode: string, userId?: string) {
  if (mode === 'admin') return;
  const user = await db
    .prepare('SELECT email, is_admin FROM user WHERE id = ?')
    .bind(userId ?? '')
    .first<{ email: string; is_admin: number }>();
  if (!user || !isAdminUser({ email: user.email, isAdmin: Boolean(user.is_admin) })) {
    throw new AssistanceError('仅站方管理员可使用素材协助工具', 403);
  }
}
