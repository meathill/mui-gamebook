import { getCloudflareContext } from '@opennextjs/cloudflare';
import { asc, desc, like, or, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { NextResponse } from 'next/server';
import * as schema from '@/db/schema';
import { isRootUser } from '@/lib/admin';
import { createAuth } from '@/lib/auth-config';
import { GAME_COUNT_SUBQUERY, PLAN_CODE_SUBQUERY, SUBSCRIPTION_STATUS_SUBQUERY } from '@/lib/admin-queries';
import { getSession } from '@/lib/auth-server';
import { parseEnumFilter, parseListQuery } from '@/lib/list-query';

/** 用户列表可排序字段（键 → drizzle 列），未知键回退 defaultSort */
const USER_SORT_COLUMNS = {
  createdAt: schema.user.createdAt,
  email: schema.user.email,
  name: schema.user.name,
  gameCount: GAME_COUNT_SUBQUERY,
} as const;

const DEFAULT_USER_SORT = 'createdAt';

const ROLE_FILTERS = ['all', 'admin', 'user'] as const;

/**
 * GET /api/admin/users
 * 获取用户列表（分页 + 搜索 + 排序 + 身份筛选），仅 root 管理员可用
 * Query: ?page=1&limit=20&search=xxx&sort=createdAt&order=desc&role=all|admin|user
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

    const query = parseListQuery(url, { allowedSorts: Object.keys(USER_SORT_COLUMNS), defaultSort: DEFAULT_USER_SORT });
    const role = parseEnumFilter(url.searchParams.get('role'), ROLE_FILTERS, 'all');

    const conditions = [];
    if (query.search) {
      const pattern = `%${query.search}%`;
      conditions.push(or(like(schema.user.name, pattern), like(schema.user.email, pattern)));
    }
    // root 身份只由环境变量决定（不在 user.is_admin 里），这里用同一个值把 root 归到「管理员」一侧
    const rootEmail = (process.env.NEXT_PUBLIC_ROOT_USER_EMAIL ?? '').trim().toLowerCase();
    if (role === 'admin') {
      conditions.push(sql`(${schema.user.isAdmin} = 1 OR LOWER(${schema.user.email}) = ${rootEmail})`);
    } else if (role === 'user') {
      conditions.push(sql`(${schema.user.isAdmin} = 0 AND LOWER(${schema.user.email}) != ${rootEmail})`);
    }
    const where = conditions.length > 0 ? sql.join(conditions, sql` AND `) : undefined;

    const baseQuery = db
      .select({
        id: schema.user.id,
        name: schema.user.name,
        email: schema.user.email,
        emailVerified: schema.user.emailVerified,
        createdAt: schema.user.createdAt,
        aiPermissions: schema.user.aiPermissions,
        isAdmin: schema.user.isAdmin,
        gameCount: GAME_COUNT_SUBQUERY,
        // 当前有效订阅的套餐码与状态；无有效订阅时为 null
        planCode: PLAN_CODE_SUBQUERY,
        subscriptionStatus: SUBSCRIPTION_STATUS_SUBQUERY,
      })
      .from(schema.user);

    const sortColumn = USER_SORT_COLUMNS[query.sort as keyof typeof USER_SORT_COLUMNS] ?? USER_SORT_COLUMNS.createdAt;
    const orderedQuery = baseQuery.orderBy(query.order === 'asc' ? asc(sortColumn) : desc(sortColumn));
    const users = await (where ? orderedQuery.where(where) : orderedQuery).limit(query.limit).offset(query.offset);

    const countQuery = db.select({ count: sql<number>`COUNT(*)` }).from(schema.user);
    const countResult = await (where ? countQuery.where(where) : countQuery).get();
    const total = countResult?.count || 0;

    return NextResponse.json({
      users,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    });
  } catch (error) {
    console.error('Admin users list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/users
 * 创建新用户，仅 root 管理员可用
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

    return NextResponse.json({
      success: true,
      user: { id: result.user.id, name: result.user.name, email: result.user.email },
    });
  } catch (error) {
    console.error('Admin create user error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
