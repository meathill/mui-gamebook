import { NextResponse } from 'next/server';
import { getUserAiPermissions } from '@/lib/ai-permissions';
import { getSession } from '@/lib/auth-server';
import { getConfig } from '@/lib/config';
import { getUserAiPreferences, isPaidAiUser } from '@/lib/user-ai-settings';

/**
 * 获取 CMS 当前配置（用户级别，非管理员）
 * 只返回用户需要知道的各模态配置信息与当前用户的 AI 权限
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const config = await getConfig();
    const aiPermissions = await getUserAiPermissions(session.user);
    // 付费用户的自选模型作为编辑器默认（须仍在许可列表内，否则忽略）
    const [preferences, isPaid] = await Promise.all([
      getUserAiPreferences(session.user.id),
      isPaidAiUser(session.user),
    ]);
    const userDefaultAi =
      isPaid && preferences.text && aiPermissions.providers.includes(preferences.text.provider)
        ? preferences.text
        : null;
    const pickMedia = <P extends string>(
      preference: { provider: P; model: string } | null,
      serviceAllowed: boolean,
      allowed: readonly string[],
    ) => (isPaid && preference && serviceAllowed && allowed.includes(preference.provider) ? preference : null);

    return NextResponse.json({
      defaultTextProvider: config.defaultTextProvider,
      defaultAiProvider: config.defaultTextProvider,
      defaultTtsProvider: config.defaultTtsProvider,
      defaultImageProvider: config.defaultImageProvider,
      defaultVideoProvider: config.defaultVideoProvider,
      defaultSttProvider: config.defaultSttProvider,
      aiPermissions,
      userDefaultAiProvider: userDefaultAi?.provider ?? null,
      userDefaultAiModel: userDefaultAi?.model ?? null,
      userDefaultImage: pickMedia(preferences.image, aiPermissions.canGenerateImage, ['google', 'openai']),
      userDefaultTts: pickMedia(preferences.tts, aiPermissions.canGenerateTts, ['mimo', 'google', 'openai']),
      userDefaultVideo: pickMedia(preferences.video, aiPermissions.canGenerateVideo, ['google', 'openai']),
    });
  } catch (e: unknown) {
    console.error('获取配置失败:', e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
