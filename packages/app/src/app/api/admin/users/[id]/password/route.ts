import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { getSession } from '@/lib/auth-server';
import { isRootUser } from '@/lib/config';
import { createAuth } from '@/lib/auth-config';

type Props = {
  params: Promise<{ id: string }>;
};

/**
 * PUT /api/admin/users/[id]/password
 * 重置用户密码（管理员操作）
 * Body: { newPassword }
 */
export async function PUT(request: Request, { params }: Props) {
  try {
    const session = await getSession();
    if (!session?.user?.email || !isRootUser(session.user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = (await request.json()) as { newPassword?: string };
    const { newPassword } = body;

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: '密码至少需要6个字符' }, { status: 400 });
    }

    const { env } = getCloudflareContext();
    const db = drizzle(env.DB);
    const auth = createAuth(env);

    // 找到用户的 credential account
    const credentialAccount = await db
      .select()
      .from(schema.account)
      .where(and(eq(schema.account.userId, id), eq(schema.account.providerId, 'credential')))
      .get();

    if (!credentialAccount) {
      return NextResponse.json({ error: '该用户没有密码登录方式' }, { status: 400 });
    }

    // 使用 better-auth 的内部方法哈希密码
    const ctx = await auth.$context;
    const hashedPassword = await ctx.password.hash(newPassword);

    // 更新密码
    await db
      .update(schema.account)
      .set({ password: hashedPassword })
      .where(eq(schema.account.id, credentialAccount.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin reset password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
