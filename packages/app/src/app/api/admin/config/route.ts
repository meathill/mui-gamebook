import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-server';
import { getConfig, updateConfig, isRootUser, type AppConfig } from '@/lib/config';

/**
 * 获取全局配置
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user?.email || !isRootUser(session.user.email)) {
      return NextResponse.json({ error: '无权限访问' }, { status: 403 });
    }

    const config = await getConfig();
    return NextResponse.json(config);
  } catch (e: unknown) {
    console.error('获取配置失败:', e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/**
 * 更新全局配置
 */
export async function PUT(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.email || !isRootUser(session.user.email)) {
      return NextResponse.json({ error: '无权限访问' }, { status: 403 });
    }

    const body = (await req.json()) as Partial<AppConfig>;
    await updateConfig(body);

    const newConfig = await getConfig();
    return NextResponse.json({
      message: '配置已更新',
      config: newConfig,
    });
  } catch (e: unknown) {
    console.error('更新配置失败:', e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
