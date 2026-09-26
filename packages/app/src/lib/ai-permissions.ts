/**
 * 用户 AI 权限
 *
 * 权限来源优先级：
 * 1. root（NEXT_PUBLIC_ROOT_USER_EMAIL）与内容管理员（user.is_admin）全开
 * 2. user.ai_permissions 非空 → 以管理员在用户管理里的显式勾选为准
 * 3. 否则跟随当前有效订阅套餐的默认权限（未订阅 = 只有文本）
 */

import type { AiProviderType } from '@mui-gamebook/core/lib/ai-provider';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '@/db/schema';
import { isRootUser } from './admin';
import { getUsableSubscription, type PlanCode } from './billing';

export interface AiPermissions {
  // 可用的文本 AI 提供者，第一项为该用户的默认提供者
  providers: AiProviderType[];
  canGenerateImage: boolean;
  canGenerateTts: boolean;
  canGenerateMusic: boolean;
  canGenerateVideo: boolean;
}

export const ALL_TEXT_PROVIDERS: AiProviderType[] = ['opencode', 'mimo', 'anthropic', 'google', 'openai'];

/** 按订阅档位给出的默认权限：免费只有文本，Pro 加生图/声音/音乐，Pro+ 再加视频 */
export const PLAN_AI_PERMISSIONS: Record<PlanCode | 'free', AiPermissions> = {
  free: {
    providers: ALL_TEXT_PROVIDERS,
    canGenerateImage: false,
    canGenerateTts: false,
    canGenerateMusic: false,
    canGenerateVideo: false,
  },
  basic: {
    providers: ALL_TEXT_PROVIDERS,
    canGenerateImage: true,
    canGenerateTts: true,
    canGenerateMusic: true,
    canGenerateVideo: false,
  },
  pro: {
    providers: ALL_TEXT_PROVIDERS,
    canGenerateImage: true,
    canGenerateTts: true,
    canGenerateMusic: true,
    canGenerateVideo: true,
  },
};

export const DEFAULT_AI_PERMISSIONS: AiPermissions = PLAN_AI_PERMISSIONS.free;

export const ROOT_AI_PERMISSIONS: AiPermissions = PLAN_AI_PERMISSIONS.pro;

/** 受权限控制的服务类型 */
export type AiService = 'text' | 'image' | 'tts' | 'music' | 'video';

const SERVICE_FLAGS: Record<Exclude<AiService, 'text'>, keyof AiPermissions> = {
  image: 'canGenerateImage',
  tts: 'canGenerateTts',
  music: 'canGenerateMusic',
  video: 'canGenerateVideo',
};

const SERVICE_LABELS: Record<Exclude<AiService, 'text'>, string> = {
  image: '图片生成',
  tts: '语音合成',
  music: '音乐生成',
  video: '视频生成',
};

function isProviderType(value: unknown): value is AiProviderType {
  return typeof value === 'string' && (ALL_TEXT_PROVIDERS as string[]).includes(value);
}

/**
 * 解析 user.ai_permissions 里的 JSON。
 * 返回 null 表示「没有显式配置」——跟随套餐默认。
 * 旧数据缺少的新字段一律按 false 处理，不给意外提权。
 */
export function parseAiPermissions(raw: string | null | undefined): AiPermissions | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<AiPermissions>;
    const providers = Array.isArray(parsed.providers) ? parsed.providers.filter(isProviderType) : [];

    return {
      providers,
      canGenerateImage: parsed.canGenerateImage === true,
      canGenerateTts: parsed.canGenerateTts === true,
      canGenerateMusic: parsed.canGenerateMusic === true,
      canGenerateVideo: parsed.canGenerateVideo === true,
    };
  } catch {
    console.error('[AI Permissions] 解析权限 JSON 失败，按未配置处理');
    return null;
  }
}

async function resolvePlanCode(userId: string): Promise<PlanCode | 'free'> {
  const subscription = await getUsableSubscription(userId);
  return subscription?.planCode ?? 'free';
}

/**
 * 获取用户的有效 AI 权限
 */
export async function getUserAiPermissions(user: { id: string; email: string }): Promise<AiPermissions> {
  if (isRootUser(user.email)) {
    return ROOT_AI_PERMISSIONS;
  }

  const { env } = getCloudflareContext();
  const db = drizzle(env.DB);
  const rows = await db
    .select({ aiPermissions: schema.user.aiPermissions, isAdmin: schema.user.isAdmin })
    .from(schema.user)
    .where(eq(schema.user.id, user.id))
    .limit(1);

  const row = rows[0];
  if (row?.isAdmin) {
    return ROOT_AI_PERMISSIONS;
  }

  const override = parseAiPermissions(row?.aiPermissions);
  if (override) {
    // 显式配置里如果没有任何合法提供者，退回套餐默认，避免用户一个文本模型都用不了
    const plan = await resolvePlanCode(user.id);
    return override.providers.length > 0 ? override : { ...override, providers: PLAN_AI_PERMISSIONS[plan].providers };
  }

  return PLAN_AI_PERMISSIONS[await resolvePlanCode(user.id)];
}

/**
 * 解析文本生成实际使用的提供者：
 * 请求指定且在许可列表内则用之，否则用许可列表第一项（用户默认）
 */
export function resolveTextProvider(permissions: AiPermissions, requested?: string | null): AiProviderType {
  if (requested && isProviderType(requested) && permissions.providers.includes(requested)) {
    return requested;
  }
  return permissions.providers[0] ?? 'opencode';
}

/**
 * 检查某项 AI 服务的权限
 */
export function checkAiServicePermission(
  permissions: AiPermissions,
  service: Exclude<AiService, 'text'>,
): { allowed: boolean; message?: string } {
  if (permissions[SERVICE_FLAGS[service]] === true) {
    return { allowed: true };
  }
  return { allowed: false, message: `您没有权限使用${SERVICE_LABELS[service]}功能，请升级套餐或联系管理员开通` };
}
