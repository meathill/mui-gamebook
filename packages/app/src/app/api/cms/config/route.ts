import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-server';
import { getConfig } from '@/lib/config';

/**
 * 获取 CMS 当前配置（用户级别，非管理员）
 * 只返回用户需要知道的配置信息
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const config = await getConfig();
    // 只返回用户需要的配置
    return NextResponse.json({
      defaultAiProvider: config.defaultAiProvider,
    });
  } catch (e: unknown) {
    console.error('获取配置失败:', e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
