import type {
  ImageProviderType,
  TextProviderType,
  TtsProviderType,
  VideoProviderType,
} from '@mui-gamebook/core/lib/ai-provider';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '@/db/schema';
import { isRootUser, isAdminUserId } from './admin';
import {
  isImageProviderType,
  isTextProviderType,
  isTtsProviderType,
  isVideoProviderType,
  validatePreferredTextModel,
} from './ai-model-catalog';
import { getUsableSubscription } from './billing';
import type { AppConfig } from './config';

export interface UserAiModelPreference {
  provider: TextProviderType;
  model: string;
}

/** 四个模态的用户偏好（null = 跟随系统默认） */
export interface UserAiPreferences {
  text: UserAiModelPreference | null;
  image: { provider: ImageProviderType; model: string } | null;
  tts: { provider: TtsProviderType; model: string } | null;
  video: { provider: VideoProviderType; model: string } | null;
}

/**
 * 付费判定：有效订阅（含 past_due 宽限）/ 内容管理员 / root 均视为付费，
 * 允许自选 AI 模型。免费用户锁定系统默认。
 * 查询失败（边缘上下文缺失等）按非付费处理，不让偏好解析把请求打成 500。
 */
export async function isPaidAiUser(user: { id: string; email: string }): Promise<boolean> {
  try {
    if (isRootUser(user.email)) return true;
    if (await isAdminUserId(user.id)) return true;
    return (await getUsableSubscription(user.id)) !== null;
  } catch (error) {
    console.error('[UserAiSettings] 付费判定失败，按非付费处理:', error);
    return false;
  }
}

/** 读取用户保存的全部模态偏好；字段缺失或非法一律按「未设置」处理 */
export async function getUserAiPreferences(userId: string): Promise<UserAiPreferences> {
  const empty: UserAiPreferences = { text: null, image: null, tts: null, video: null };
  try {
    const { env } = getCloudflareContext();
    const db = drizzle(env.DB);
    const rows = await db
      .select({
        preferredTextProvider: schema.user.preferredTextProvider,
        preferredTextModel: schema.user.preferredTextModel,
        preferredImageProvider: schema.user.preferredImageProvider,
        preferredImageModel: schema.user.preferredImageModel,
        preferredTtsProvider: schema.user.preferredTtsProvider,
        preferredTtsModel: schema.user.preferredTtsModel,
        preferredVideoProvider: schema.user.preferredVideoProvider,
        preferredVideoModel: schema.user.preferredVideoModel,
      })
      .from(schema.user)
      .where(eq(schema.user.id, userId))
      .limit(1);
    const row = rows[0];
    if (!row) return empty;
    return {
      text:
        isTextProviderType(row.preferredTextProvider) && validatePreferredTextModel(row.preferredTextModel)
          ? { provider: row.preferredTextProvider, model: row.preferredTextModel as string }
          : null,
      image:
        isImageProviderType(row.preferredImageProvider) && validatePreferredTextModel(row.preferredImageModel)
          ? { provider: row.preferredImageProvider, model: row.preferredImageModel as string }
          : null,
      tts:
        isTtsProviderType(row.preferredTtsProvider) && validatePreferredTextModel(row.preferredTtsModel)
          ? { provider: row.preferredTtsProvider, model: row.preferredTtsModel as string }
          : null,
      video:
        isVideoProviderType(row.preferredVideoProvider) && validatePreferredTextModel(row.preferredVideoModel)
          ? { provider: row.preferredVideoProvider, model: row.preferredVideoModel as string }
          : null,
    };
  } catch (error) {
    console.error('[UserAiSettings] 读取偏好失败:', error);
    return empty;
  }
}

/** 读取用户保存的文本模型偏好；字段缺失或非法一律按「未设置」处理 */
export async function getUserAiModelPreference(userId: string): Promise<UserAiModelPreference | null> {
  return (await getUserAiPreferences(userId)).text;
}

/** 系统默认模型：与 ai-provider-factory 各分支实际使用的模型保持一致 */
export function getDefaultTextModelForProvider(config: AppConfig, provider: TextProviderType): string {
  switch (provider) {
    case 'opencode':
      return config.opencodeTextModel;
    case 'mimo':
      return config.mimoTextModel;
    case 'anthropic':
      return config.anthropicTextModel;
    case 'google':
      return config.googleTextModel;
    case 'openai':
      return config.openaiTextModel;
  }
}

export function getDefaultImageModelForProvider(config: AppConfig, provider: ImageProviderType): string {
  return provider === 'google' ? config.googleImageModel : config.openaiImageModel;
}

export function getDefaultTtsModelForProvider(config: AppConfig, provider: TtsProviderType): string {
  switch (provider) {
    case 'mimo':
      return config.mimoTtsModel;
    case 'google':
      return config.googleTtsModel;
    case 'openai':
      return config.openaiTtsModel;
  }
}

export function getDefaultVideoModelForProvider(config: AppConfig, provider: VideoProviderType): string {
  return provider === 'google' ? config.googleVideoModel : config.openaiVideoModel;
}

export interface EffectiveTextSelection {
  provider: TextProviderType;
  /** 实际发往 provider 的模型 ID（付费偏好或系统默认） */
  model: string;
  /** 是否命中了用户自选（用于用量记录与前端展示） */
  isCustom: boolean;
}

export interface EffectiveMediaSelection<P> {
  provider: P;
  /** 实际发往 provider 的模型 ID（付费偏好或系统默认） */
  model: string;
  /** 是否命中了用户自选 */
  isCustom: boolean;
}

/**
 * 解析一次文本请求实际使用的 provider + model：
 * - provider：请求指定且在许可内则用之，否则用用户偏好，否则用许可第一项
 * - model：仅当最终 provider 与用户偏好 provider 一致、且用户是付费身份时，
 *   才使用用户自选模型（或本次请求附带的合法 model）；其余一律系统默认。
 *   免费用户传 model 会被静默忽略，不报错（避免编辑器旧缓存导致 400）。
 */
export function resolveEffectiveTextSelection(options: {
  permissionsProviders: TextProviderType[];
  systemDefaultProvider: TextProviderType;
  getSystemModel: (provider: TextProviderType) => string;
  userPreference: UserAiModelPreference | null;
  isPaid: boolean;
  requestedProvider?: string | null;
  requestedModel?: string | null;
}): EffectiveTextSelection {
  const { permissionsProviders, systemDefaultProvider, getSystemModel, userPreference, isPaid } = options;
  const fallbackProviders = permissionsProviders.length > 0 ? permissionsProviders : [systemDefaultProvider];

  let provider: TextProviderType = systemDefaultProvider;
  if (options.requestedProvider && isTextProviderType(options.requestedProvider)) {
    provider = permissionsProviders.includes(options.requestedProvider)
      ? options.requestedProvider
      : (fallbackProviders[0] ?? systemDefaultProvider);
  } else if (isPaid && userPreference && permissionsProviders.includes(userPreference.provider)) {
    // 免费用户忽略历史偏好（可能为退订残留），锁定系统默认
    provider = userPreference.provider;
  } else {
    provider = fallbackProviders[0] ?? systemDefaultProvider;
  }

  if (isPaid) {
    if (
      options.requestedModel &&
      validatePreferredTextModel(options.requestedModel) &&
      // 请求附带的 model 只在与最终 provider 匹配时采信，避免 provider/model 错配
      (!userPreference || provider === userPreference.provider || !options.requestedProvider)
    ) {
      return { provider, model: options.requestedModel, isCustom: true };
    }
    if (userPreference && provider === userPreference.provider) {
      return { provider, model: userPreference.model, isCustom: true };
    }
  }
  return { provider, model: getSystemModel(provider), isCustom: false };
}

/**
 * 解析图片/语音/视频三模态实际使用的 provider + model。
 * 媒体路由前端不传 provider（无切换器），以后端偏好为准：
 * - 服务位关闭（无权使用该服务）→ 忽略一切偏好，用系统默认
 *   （调用方路由此前已按服务位返回 403，这里是纵深兜底）
 * - 非付费 → 系统默认（忽略可能存在的退订残留偏好）
 * - 偏好供应商不在该模态能力名单内 → 系统默认
 */
export function resolveEffectiveMediaSelection<P extends string>(options: {
  allowedProviders: readonly P[];
  systemDefaultProvider: P;
  getSystemModel: (provider: P) => string;
  userPreference: { provider: P; model: string } | null;
  isPaid: boolean;
  serviceAllowed: boolean;
}): EffectiveMediaSelection<P> {
  const { allowedProviders, systemDefaultProvider, getSystemModel, userPreference, isPaid, serviceAllowed } = options;
  if (
    serviceAllowed &&
    isPaid &&
    userPreference &&
    (allowedProviders as readonly string[]).includes(userPreference.provider)
  ) {
    return { provider: userPreference.provider, model: userPreference.model, isCustom: true };
  }
  return { provider: systemDefaultProvider, model: getSystemModel(systemDefaultProvider), isCustom: false };
}
