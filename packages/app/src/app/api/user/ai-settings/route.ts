import { getCloudflareContext } from '@opennextjs/cloudflare';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { NextResponse } from 'next/server';
import type { ImageProviderType, TtsProviderType, VideoProviderType } from '@mui-gamebook/core/lib/ai-provider';
import * as schema from '@/db/schema';
import { getUserAiPermissions } from '@/lib/ai-permissions';
import {
  IMAGE_MODEL_PRESETS,
  isAiModelModality,
  isImageProviderType,
  isTextProviderType,
  isTtsProviderType,
  isVideoProviderType,
  MODALITY_PROVIDERS,
  TEXT_MODEL_PRESETS,
  TTS_MODEL_PRESETS,
  validatePreferredTextModel,
  VIDEO_MODEL_PRESETS,
  type AiModelModality,
} from '@/lib/ai-model-catalog';
import { getSession } from '@/lib/auth-server';
import { getConfig } from '@/lib/config';
import {
  getDefaultImageModelForProvider,
  getDefaultTextModelForProvider,
  getDefaultTtsModelForProvider,
  getDefaultVideoModelForProvider,
  getUserAiPreferences,
  isPaidAiUser,
} from '@/lib/user-ai-settings';

function isProviderForModality(modality: AiModelModality, provider: string): boolean {
  switch (modality) {
    case 'text':
      return isTextProviderType(provider);
    case 'image':
      return isImageProviderType(provider);
    case 'tts':
      return isTtsProviderType(provider);
    case 'video':
      return isVideoProviderType(provider);
  }
}

/**
 * 当前用户的 AI 模型设置（文本/图片/语音/视频四个模态）。
 * - 免费用户：isPaid=false，只能看系统默认（锁定）
 * - 付费用户（有效订阅/管理员/root）：可自选各模态 provider + model，
 *   图片/语音/视频三节还受 ai_permissions 对应服务位约束
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [config, preferences, isPaid, permissions] = await Promise.all([
      getConfig(),
      getUserAiPreferences(session.user.id),
      isPaidAiUser(session.user),
      getUserAiPermissions(session.user),
    ]);

    return NextResponse.json({
      isPaid,
      // 兼容旧字段：文本偏好
      preference: preferences.text,
      preferences,
      providers: permissions.providers,
      services: {
        image: permissions.canGenerateImage,
        tts: permissions.canGenerateTts,
        music: permissions.canGenerateMusic,
        video: permissions.canGenerateVideo,
      },
      systemDefaultProvider: config.defaultTextProvider,
      systemDefaultModel: getDefaultTextModelForProvider(config, config.defaultTextProvider),
      systemDefaults: {
        text: {
          provider: config.defaultTextProvider,
          model: getDefaultTextModelForProvider(config, config.defaultTextProvider),
        },
        image: {
          provider: config.defaultImageProvider,
          model: getDefaultImageModelForProvider(config, config.defaultImageProvider),
        },
        tts: {
          provider: config.defaultTtsProvider,
          model: getDefaultTtsModelForProvider(config, config.defaultTtsProvider),
        },
        video: {
          provider: config.defaultVideoProvider,
          model: getDefaultVideoModelForProvider(config, config.defaultVideoProvider),
        },
      },
      presets: TEXT_MODEL_PRESETS,
      modalityPresets: {
        image: IMAGE_MODEL_PRESETS,
        tts: TTS_MODEL_PRESETS,
        video: VIDEO_MODEL_PRESETS,
      },
      modalityProviders: MODALITY_PROVIDERS,
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
    modality?: string | null;
    provider?: string | null;
    model?: string | null;
  } | null;
  if (!body) {
    return NextResponse.json({ error: '请求体不合法' }, { status: 400 });
  }

  const modality: AiModelModality = isAiModelModality(body.modality) ? body.modality : 'text';

  // 清空偏好：跟随系统默认，免费用户也允许（等价于不设置）
  if (body.provider == null || body.provider === '') {
    try {
      const { env } = getCloudflareContext();
      const db = drizzle(env.DB);
      const base = { updatedAt: new Date() };
      if (modality === 'image') {
        await db
          .update(schema.user)
          .set({ ...base, preferredImageProvider: null, preferredImageModel: null })
          .where(eq(schema.user.id, session.user.id));
      } else if (modality === 'tts') {
        await db
          .update(schema.user)
          .set({ ...base, preferredTtsProvider: null, preferredTtsModel: null })
          .where(eq(schema.user.id, session.user.id));
      } else if (modality === 'video') {
        await db
          .update(schema.user)
          .set({ ...base, preferredVideoProvider: null, preferredVideoModel: null })
          .where(eq(schema.user.id, session.user.id));
      } else {
        await db
          .update(schema.user)
          .set({ ...base, preferredTextProvider: null, preferredTextModel: null })
          .where(eq(schema.user.id, session.user.id));
      }
      return NextResponse.json({ preference: null });
    } catch (e: unknown) {
      console.error('清空 AI 设置失败:', e);
      return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }
  }

  if (!(await isPaidAiUser(session.user))) {
    return NextResponse.json({ error: '订阅 Pro / Pro+ 后可自选 AI 模型' }, { status: 403 });
  }

  if (!isProviderForModality(modality, body.provider)) {
    return NextResponse.json({ error: '该模态不支持此供应商' }, { status: 400 });
  }
  if (!validatePreferredTextModel(body.model)) {
    return NextResponse.json({ error: '模型 ID 不合法（1-128 字符，仅允许字母数字 . _ - / :）' }, { status: 400 });
  }

  // 文本：自选供应商必须在用户许可列表内；媒体：必须有所属服务的权限位
  const permissions = await getUserAiPermissions(session.user);
  if (modality === 'text') {
    if (!isTextProviderType(body.provider) || !permissions.providers.includes(body.provider)) {
      return NextResponse.json({ error: '当前账号无权使用该供应商' }, { status: 403 });
    }
  } else {
    const serviceFlag =
      modality === 'image'
        ? permissions.canGenerateImage
        : modality === 'tts'
          ? permissions.canGenerateTts
          : permissions.canGenerateVideo;
    if (!serviceFlag) {
      return NextResponse.json({ error: '当前账号无权使用该服务' }, { status: 403 });
    }
  }

  try {
    const { env } = getCloudflareContext();
    const db = drizzle(env.DB);
    const preference = { provider: body.provider, model: body.model as string };
    // 各模态列类型不同（文本/图片/语音/视频供应商联合类型），按分支写入以通过类型检查
    if (modality === 'text' && isTextProviderType(preference.provider)) {
      await db
        .update(schema.user)
        .set({
          preferredTextProvider: preference.provider,
          preferredTextModel: preference.model,
          updatedAt: new Date(),
        })
        .where(eq(schema.user.id, session.user.id));
      return NextResponse.json({ preference });
    }
    if (modality === 'image' && isImageProviderType(preference.provider)) {
      const provider: ImageProviderType = preference.provider;
      await db
        .update(schema.user)
        .set({ preferredImageProvider: provider, preferredImageModel: preference.model, updatedAt: new Date() })
        .where(eq(schema.user.id, session.user.id));
      return NextResponse.json({ preference });
    }
    if (modality === 'tts' && isTtsProviderType(preference.provider)) {
      const provider: TtsProviderType = preference.provider;
      await db
        .update(schema.user)
        .set({ preferredTtsProvider: provider, preferredTtsModel: preference.model, updatedAt: new Date() })
        .where(eq(schema.user.id, session.user.id));
      return NextResponse.json({ preference });
    }
    if (modality === 'video' && isVideoProviderType(preference.provider)) {
      const provider: VideoProviderType = preference.provider;
      await db
        .update(schema.user)
        .set({ preferredVideoProvider: provider, preferredVideoModel: preference.model, updatedAt: new Date() })
        .where(eq(schema.user.id, session.user.id));
      return NextResponse.json({ preference });
    }
    return NextResponse.json({ error: '该模态不支持此供应商' }, { status: 400 });
  } catch (e: unknown) {
    console.error('保存 AI 设置失败:', e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
