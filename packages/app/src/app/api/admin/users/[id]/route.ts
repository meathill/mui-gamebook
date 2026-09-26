import { getCloudflareContext } from '@opennextjs/cloudflare';
import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { NextResponse } from 'next/server';
import * as schema from '@/db/schema';
import { isRootUser } from '@/lib/admin';
import { GAME_COUNT_SUBQUERY } from '@/lib/admin-queries';
import { ALL_TEXT_PROVIDERS, type AiPermissions } from '@/lib/ai-permissions';
import { getSession } from '@/lib/auth-server';

type Props = {
  params: Promise<{ id: string }>;
};

/** 布尔权限位一律按严格 true 处理，避免客户端传来真值字符串被当成授权 */
function normalizePermissions(input: Partial<AiPermissions>): AiPermissions {
  return {
    providers: Array.isArray(input.providers)
      ? input.providers.filter((p): p is (typeof ALL_TEXT_PROVIDERS)[number] =>
          (ALL_TEXT_PROVIDERS as string[]).includes(p),
        )
      : [],
    canGenerateImage: input.canGenerateImage === true,
    canGenerateTts: input.canGenerateTts === true,
    canGenerateMusic: input.canGenerateMusic === true,
    canGenerateVideo: input.canGenerateVideo === true,
  };
}

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
        aiPermissions: schema.user.aiPermissions,
        isAdmin: schema.user.isAdmin,
        gameCount: GAME_COUNT_SUBQUERY,
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
 * 更新用户信息与权限
 * Body: { name?, email?, aiPermissions?: AiPermissions | null, isAdmin?: boolean }
 * aiPermissions = null 表示恢复「跟随套餐默认」；isAdmin 只有 root 能改，且不能取消自己的管理员身份
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
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      aiPermissions?: Partial<AiPermissions> | null;
      isAdmin?: boolean;
    };
    const { name, email, aiPermissions, isAdmin } = body;

    if (!name && !email && aiPermissions === undefined && isAdmin === undefined) {
      return NextResponse.json({ error: '至少需要提供名称、邮箱、权限或管理员标记' }, { status: 400 });
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (name) updates.name = name;
    if (email) updates.email = email;
    if (isAdmin !== undefined) {
      if (id === session.user.id && isAdmin === false) {
        return NextResponse.json({ error: '不能取消自己的管理员权限' }, { status: 400 });
      }
      updates.isAdmin = isAdmin === true;
    }
    if (aiPermissions !== undefined) {
      if (aiPermissions === null) {
        // null = 恢复默认（跟随订阅套餐）
        updates.aiPermissions = null;
      } else {
        const normalized = normalizePermissions(aiPermissions);
        if (normalized.providers.length === 0) {
          return NextResponse.json({ error: '至少需要保留一个可用的 AI 提供者' }, { status: 400 });
        }
        updates.aiPermissions = JSON.stringify(normalized);
      }
    }

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
