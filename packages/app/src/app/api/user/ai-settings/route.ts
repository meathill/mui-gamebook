import { getCloudflareContext } from '@opennextjs/cloudflare';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { NextResponse } from 'next/server';
import * as schema from '@/db/schema';
import { getUserAiPermissions } from '@/lib/ai-permissions';
import { TEXT_MODEL_PRESETS, isTextProviderType, validatePreferredTextModel } from '@/lib/ai-model-catalog';
import { getSession } from '@/lib/auth-server';
import { getConfig } from '@/lib/config';
import { getDefaultTextModelForProvider, getUserAiModelPreference, isPaidAiUser } from '@/lib/user-ai-settings';

/**
 * 当前用户的 AI 模型设置。
 * - 免费用户：isPaid=false，只能看系统默认（锁定）
 * - 付费用户（有效订阅/管理员/root）：可自选 provider + model
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [config, preference, isPaid, permissions] = await Promise.all([
      getConfig(),
      getUserAiModelPreference(session.user.id),
      isPaidAiUser(session.user),
      getUserAiPermissions(session.user),
    ]);

    return NextResponse.json({
      isPaid,
      preference,
      providers: permissions.providers,
      systemDefaultProvider: config.defaultTextProvider,
      systemDefaultModel: getDefaultTextModelForProvider(config, config.defaultTextProvider),
      presets: TEXT_MODEL_PRESETS,
    });
  } catch (e: unknown) {
    console.error('获取 AI 设置失败:', e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    provider?: string | null;
    model?: string | null;
  } | null;
  if (!body) {
    return NextResponse.json({ error: '请求体不合法' }, { status: 400 });
  }

  // 清空偏好：跟随系统默认，免费用户也允许（等价于不设置）
  if (body.provider == null || body.provider === '') {
    try {
      const { env } = getCloudflareContext();
      const db = drizzle(env.DB);
      await db
        .update(schema.user)
        .set({ preferredTextProvider: null, preferredTextModel: null, updatedAt: new Date() })
        .where(eq(schema.user.id, session.user.id));
      return NextResponse.json({ preference: null });
    } catch (e: unknown) {
      console.error('清空 AI 设置失败:', e);
      return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }
  }

  if (!(await isPaidAiUser(session.user))) {
    return NextResponse.json({ error: '订阅 Pro / Pro+ 后可自选 AI 模型' }, { status: 403 });
  }

  if (!isTextProviderType(body.provider)) {
    return NextResponse.json({ error: '不支持的供应商' }, { status: 400 });
  }
  if (!validatePreferredTextModel(body.model)) {
    return NextResponse.json({ error: '模型 ID 不合法（1-128 字符，仅允许字母数字 . _ - / :）' }, { status: 400 });
  }

  // 自选供应商必须在用户许可列表内（管理员显式禁用的供应商不能绕过）
  const permissions = await getUserAiPermissions(session.user);
  if (!permissions.providers.includes(body.provider)) {
    return NextResponse.json({ error: '当前账号无权使用该供应商' }, { status: 403 });
  }

  try {
    const { env } = getCloudflareContext();
    const db = drizzle(env.DB);
    await db
      .update(schema.user)
      .set({ preferredTextProvider: body.provider, preferredTextModel: body.model, updatedAt: new Date() })
      .where(eq(schema.user.id, session.user.id));
    return NextResponse.json({ preference: { provider: body.provider, model: body.model } });
  } catch (e: unknown) {
    console.error('保存 AI 设置失败:', e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
