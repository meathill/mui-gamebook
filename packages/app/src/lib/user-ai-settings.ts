import type { TextProviderType } from '@mui-gamebook/core/lib/ai-provider';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '@/db/schema';
import { isRootUser, isAdminUserId } from './admin';
import { isTextProviderType, validatePreferredTextModel } from './ai-model-catalog';
import { getUsableSubscription } from './billing';
import type { AppConfig } from './config';

export interface UserAiModelPreference {
  provider: TextProviderType;
  model: string;
}

/**
 * 付费判定：有效订阅（含 past_due 宽限）/ 内容管理员 / root 均视为付费，
 * 允许自选 AI 模型。免费用户锁定系统默认。
 */
export async function isPaidAiUser(user: { id: string; email: string }): Promise<boolean> {
  if (isRootUser(user.email)) return true;
  if (await isAdminUserId(user.id)) return true;
  return (await getUsableSubscription(user.id)) !== null;
}

/** 读取用户保存的模型偏好；字段缺失或非法一律按「未设置」处理 */
export async function getUserAiModelPreference(userId: string): Promise<UserAiModelPreference | null> {
  try {
    const { env } = getCloudflareContext();
    const db = drizzle(env.DB);
    const rows = await db
      .select({
        preferredTextProvider: schema.user.preferredTextProvider,
        preferredTextModel: schema.user.preferredTextModel,
      })
      .from(schema.user)
      .where(eq(schema.user.id, userId))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    if (!isTextProviderType(row.preferredTextProvider)) return null;
    if (!validatePreferredTextModel(row.preferredTextModel)) return null;
    return { provider: row.preferredTextProvider, model: row.preferredTextModel as string };
  } catch (error) {
    console.error('[UserAiSettings] 读取偏好失败:', error);
    return null;
  }
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

export interface EffectiveTextSelection {
  provider: TextProviderType;
  /** 实际发往 provider 的模型 ID（付费偏好或系统默认） */
  model: string;
  /** 是否命中了用户自选（用于用量记录与前端展示） */
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
