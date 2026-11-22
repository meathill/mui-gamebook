import { getCloudflareContext } from '@opennextjs/cloudflare';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { NextResponse } from 'next/server';
import * as schema from '@/db/schema';
import { isAdminUser, isRootUser } from '@/lib/admin';
import { getSession } from '@/lib/auth-server';
import { revalidatePublicCatalog } from '@/lib/public-cache';

type Props = {
  params: Promise<{ id: string }>;
};

/**
 * PATCH /api/admin/users/[id]/ban
 * 封禁 / 解封用户（root 或内容管理员可用）
 * Body: { banned: boolean, banReason?: string, shadowBanGames?: boolean }
 *
 * 封禁动作：
 * - 标记 banned / banned_at / ban_reason
 * - 级联删除该用户全部 session（立即踢下线）
 * - shadowBanGames = true 时同时下架其全部已发布作品（NSFW 处置常规操作，默认由前端勾选）
 * 解封只重置封禁字段，不自动恢复其作品（作品需管理员逐个解封）。
 */
export async function PATCH(request: Request, { params }: Props) {
  try {
    const session = await getSession();
    if (!session?.user?.email || !isAdminUser(session.user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const { env } = getCloudflareContext();
    const db = drizzle(env.DB);
    const body = (await request.json()) as {
      banned?: boolean;
      banReason?: string;
      shadowBanGames?: boolean;
    };
    const { banned, banReason, shadowBanGames } = body;

    if (typeof banned !== 'boolean') {
      return NextResponse.json({ error: 'banned 必须为布尔值' }, { status: 400 });
    }
    if (banned && id === session.user.id) {
      return NextResponse.json({ error: '不能封禁自己' }, { status: 400 });
    }

    const target = await db.select({ email: schema.user.email }).from(schema.user).where(eq(schema.user.id, id)).get();
    if (!target) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }
    if (banned && isRootUser(target.email)) {
      return NextResponse.json({ error: '不能封禁 root 账号' }, { status: 400 });
    }

    const now = new Date();
    if (banned) {
      await db
        .update(schema.user)
        .set({
          banned: true,
          bannedAt: now,
          banReason: banReason?.trim() || null,
          updatedAt: now,
        })
        .where(eq(schema.user.id, id));

      // 踢下线：封禁后立即失效全部 session，登录入口也被 OTP 发码回调拦住
      await db.delete(schema.session).where(eq(schema.session.userId, id));

      if (shadowBanGames) {
        const bannedGames = await db
          .update(schema.games)
          .set({ shadowBanned: true })
          .where(and(eq(schema.games.ownerId, id), eq(schema.games.published, true)))
          .returning({ slug: schema.games.slug, tags: schema.games.tags });
        if (bannedGames.length > 0) {
          // 批量下架后整体失效公开目录缓存（逐个失效量大且无必要）
          revalidatePublicCatalog();
          console.log(`[Ban] 用户 ${target.email} 的 ${bannedGames.length} 个已发布作品已同步下架`);
        }
      }
    } else {
      await db
        .update(schema.user)
        .set({ banned: false, bannedAt: null, banReason: null, updatedAt: now })
        .where(eq(schema.user.id, id));
    }

    return NextResponse.json({ success: true, banned });
  } catch (error) {
    console.error('Admin ban user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
