import { NextResponse } from 'next/server';
import type { TtsProviderType } from '@mui-gamebook/core/lib/ai-provider';
import { MODALITY_PROVIDERS } from '@/lib/ai-model-catalog';
import { checkAiServicePermission, getUserAiPermissions } from '@/lib/ai-permissions';
import { generateAndUploadTTS, type TTSVoiceName } from '@/lib/ai-service';
import { recordAiUsage } from '@/lib/ai-usage';
import { getSession } from '@/lib/auth-server';
import { getConfig } from '@/lib/config';
import {
  getDefaultTtsModelForProvider,
  getUserAiPreferences,
  isPaidAiUser,
  resolveEffectiveMediaSelection,
} from '@/lib/user-ai-settings';
import { checkUserUsageLimit } from '@/lib/usage-limit';

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 检查语音合成权限
  const permissions = await getUserAiPermissions(session.user);
  const ttsPermission = checkAiServicePermission(permissions, 'tts');
  if (!ttsPermission.allowed) {
    return NextResponse.json({ error: ttsPermission.message }, { status: 403 });
  }

  // 检查用量限制
  const usageCheck = await checkUserUsageLimit(session.user.id);
  if (!usageCheck.allowed) {
    return NextResponse.json({ error: usageCheck.message }, { status: 429 });
  }

  try {
    const { text, gameId, voiceName } = (await req.json()) satisfies {
      text: string;
      gameId: string;
      voiceName?: TTSVoiceName;
    };

    if (!text || !gameId) {
      return NextResponse.json({ error: 'Missing fields: text and gameId are required' }, { status: 400 });
    }

    // 生成文件名
    const fileName = `audio/${gameId}/${Date.now()}.wav`;

    // 生成 TTS 并上传（未指定音色时按当前 TTS 提供者取默认音色；付费用户可用自选 TTS 模型）
    const config = await getConfig();
    const [preferences, isPaid] = await Promise.all([
      getUserAiPreferences(session.user.id),
      isPaidAiUser(session.user),
    ]);
    const selection = resolveEffectiveMediaSelection({
      allowedProviders: MODALITY_PROVIDERS.tts as TtsProviderType[],
      systemDefaultProvider: config.defaultTtsProvider,
      getSystemModel: (provider) => getDefaultTtsModelForProvider(config, provider),
      userPreference: preferences.tts,
      isPaid,
      serviceAllowed: ttsPermission.allowed,
    });
    const { url, usage, model } = await generateAndUploadTTS(text, fileName, voiceName, selection);

    // 记录 AI 用量
    await recordAiUsage({
      userId: session.user.id,
      type: 'audio_generation',
      model,
      usage,
      gameId: Number(gameId),
    });

    return NextResponse.json({ url });
  } catch (e: unknown) {
    console.error('Generate TTS error:', e);
    return NextResponse.json({ error: (e as Error).message || String(e) }, { status: 500 });
  }
}
