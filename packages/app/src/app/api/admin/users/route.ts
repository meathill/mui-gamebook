import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import { sql, like, or } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { getSession } from '@/lib/auth-server';
import { isRootUser } from '@/lib/config';
import { createAuth } from '@/lib/auth-config';

/**
 * GET /api/admin/users
 * 获取用户列表（分页 + 搜索），仅管理员可用
 * Query: ?page=1&limit=20&search=xxx
 */
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.email || !isRootUser(session.user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { env } = getCloudflareContext();
    const db = drizzle(env.DB);
    const url = new URL(request.url);

    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 100);
    const offset = (page - 1) * limit;
    const search = url.searchParams.get('search') || '';

    // 构建查询
    const baseQuery = db
      .select({
        id: schema.user.id,
        name: schema.user.name,
        email: schema.user.email,
        emailVerified: schema.user.emailVerified,
        createdAt: schema.user.createdAt,
        gameCount: sql<number>`(SELECT COUNT(*) FROM Games WHERE owner_id = ${schema.user.id})`,
      })
      .from(schema.user);

    let query;
    if (search) {
      const pattern = `%${search}%`;
      query = baseQuery.where(
        or(like(schema.user.name, pattern), like(schema.user.email, pattern)),
      );
    } else {
      query = baseQuery;
    }

    const users = await query.limit(limit).offset(offset);

    // 获取总数
    let countQuery;
    if (search) {
      const pattern = `%${search}%`;
      countQuery = db
        .select({ count: sql<number>`COUNT(*)` })
        .from(schema.user)
        .where(or(like(schema.user.name, pattern), like(schema.user.email, pattern)));
    } else {
      countQuery = db.select({ count: sql<number>`COUNT(*)` }).from(schema.user);
    }
    const countResult = await countQuery.get();
    const total = countResult?.count || 0;

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Admin users list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/users
 * 创建新用户，仅管理员可用
 * Body: { name, email, password }
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.email || !isRootUser(session.user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { env } = getCloudflareContext();
    const body = (await request.json()) as { name?: string; email?: string; password?: string };
    const { name, email, password } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: '名称、邮箱和密码为必填项' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: '密码至少需要6个字符' }, { status: 400 });
    }

    // 使用 better-auth 创建用户
    const auth = createAuth(env);
    const result = await auth.api.signUpEmail({
      body: { name, email, password },
    });

    if (!result) {
      return NextResponse.json({ error: '创建用户失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true, user: { id: result.user.id, name: result.user.name, email: result.user.email } });
  } catch (error) {
    console.error('Admin create user error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
