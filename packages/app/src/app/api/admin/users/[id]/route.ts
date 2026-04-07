import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import { eq, sql } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { getSession } from '@/lib/auth-server';
import { isRootUser } from '@/lib/config';

type Props = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/admin/users/[id]
 * 获取单个用户详情
 */
export async function GET(_request: Request, { params }: Props) {
  try {
    const session = await getSession();
    if (!session?.user?.email || !isRootUser(session.user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const { env } = getCloudflareContext();
    const db = drizzle(env.DB);

    const user = await db
      .select({
        id: schema.user.id,
        name: schema.user.name,
        email: schema.user.email,
        emailVerified: schema.user.emailVerified,
        createdAt: schema.user.createdAt,
        gameCount: sql<number>`(SELECT COUNT(*) FROM Games WHERE owner_id = ${schema.user.id})`,
      })
      .from(schema.user)
      .where(eq(schema.user.id, id))
      .get();

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Admin get user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/users/[id]
 * 更新用户信息
 * Body: { name, email }
 */
export async function PUT(request: Request, { params }: Props) {
  try {
    const session = await getSession();
    if (!session?.user?.email || !isRootUser(session.user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const { env } = getCloudflareContext();
    const db = drizzle(env.DB);
    const body = (await request.json()) as { name?: string; email?: string };
    const { name, email } = body;

    if (!name && !email) {
      return NextResponse.json({ error: '至少需要提供名称或邮箱' }, { status: 400 });
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (name) updates.name = name;
    if (email) updates.email = email;

    await db.update(schema.user).set(updates).where(eq(schema.user.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin update user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/users/[id]
 * 删除用户
 */
export async function DELETE(_request: Request, { params }: Props) {
  try {
    const session = await getSession();
    if (!session?.user?.email || !isRootUser(session.user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const { env } = getCloudflareContext();
    const db = drizzle(env.DB);

    // 防止删除自己
    if (id === session.user.id) {
      return NextResponse.json({ error: '不能删除自己的账户' }, { status: 400 });
    }

    // 检查用户是否有游戏
    const gameCount = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(schema.games)
      .where(eq(schema.games.ownerId, id))
      .get();

    if (gameCount && gameCount.count > 0) {
      return NextResponse.json(
        { error: `该用户拥有 ${gameCount.count} 个游戏，请先转移或删除这些游戏` },
        { status: 400 },
      );
    }

    // 删除关联数据
    await db.delete(schema.session).where(eq(schema.session.userId, id));
    await db.delete(schema.account).where(eq(schema.account.userId, id));
    await db.delete(schema.user).where(eq(schema.user.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin delete user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
