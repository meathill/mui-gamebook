import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getConfig, updateConfig, type AppConfig } from '@/lib/config';

/**
 * 获取全局配置
 */
export async function GET(req: Request) {
  try {
    const { env } = getCloudflareContext();
    const secret = env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;

    // 验证管理员密码
    const authHeader = req.headers.get('Authorization');
    if (!secret || authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    const { env } = getCloudflareContext();
    const secret = env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;

    // 验证管理员密码
    const authHeader = req.headers.get('Authorization');
    if (!secret || authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
