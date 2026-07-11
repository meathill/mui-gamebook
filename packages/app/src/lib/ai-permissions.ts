/**
 * 用户 AI 权限
 * 权限按定价分级：便宜的 MiMo 是所有人的默认，Claude/Gemini/GPT 及生图/生视频由管理员按用户开通
 */

import type { AiProviderType } from '@mui-gamebook/core/lib/ai-provider';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '@/db/schema';
import { getConfig, isRootUser } from './config';

export interface AiPermissions {
  // 可用的文本 AI 提供者，第一项为该用户的默认提供者
  providers: AiProviderType[];
  canGenerateImage: boolean;
  canGenerateVideo: boolean;
}

export const ALL_TEXT_PROVIDERS: AiProviderType[] = ['mimo', 'anthropic', 'google', 'openai'];

export const DEFAULT_AI_PERMISSIONS: AiPermissions = {
  providers: ['mimo'],
  canGenerateImage: false,
  canGenerateVideo: false,
};

export const ROOT_AI_PERMISSIONS: AiPermissions = {
  providers: ALL_TEXT_PROVIDERS,
  canGenerateImage: true,
  canGenerateVideo: true,
};

function isProviderType(value: unknown): value is AiProviderType {
  return typeof value === 'string' && (ALL_TEXT_PROVIDERS as string[]).includes(value);
}

/**
 * 解析存储在 user.ai_permissions 中的 JSON，坏数据一律回退默认权限
 */
export function parseAiPermissions(raw: string | null | undefined): AiPermissions {
  if (!raw) return DEFAULT_AI_PERMISSIONS;

  try {
    const parsed = JSON.parse(raw) as Partial<AiPermissions>;
    const providers = Array.isArray(parsed.providers) ? parsed.providers.filter(isProviderType) : [];

    return {
      providers: providers.length > 0 ? providers : DEFAULT_AI_PERMISSIONS.providers,
      canGenerateImage: parsed.canGenerateImage === true,
      canGenerateVideo: parsed.canGenerateVideo === true,
    };
  } catch {
    console.error('[AI Permissions] 解析权限 JSON 失败，回退默认权限');
    return DEFAULT_AI_PERMISSIONS;
  }
}

/**
 * 获取用户的有效 AI 权限（root 用户全开，其余读 D1）
 */
export async function getUserAiPermissions(user: { id: string; email: string }): Promise<AiPermissions> {
  if (isRootUser(user.email)) {
    return ROOT_AI_PERMISSIONS;
  }

  const { env } = getCloudflareContext();
  const db = drizzle(env.DB);
  const rows = await db
    .select({ aiPermissions: schema.user.aiPermissions })
    .from(schema.user)
    .where(eq(schema.user.id, user.id))
    .limit(1);

  return parseAiPermissions(rows[0]?.aiPermissions);
}

/**
 * 解析文本生成实际使用的提供者：
 * 请求指定且在许可列表内则用之，否则用许可列表第一项（用户默认）
 */
export function resolveTextProvider(permissions: AiPermissions, requested?: string | null): AiProviderType {
  if (requested && isProviderType(requested) && permissions.providers.includes(requested)) {
    return requested;
  }
  return permissions.providers[0] ?? 'mimo';
}

/**
 * 检查视频生成权限：新的按用户 flag 优先，旧的 videoWhitelist 作为过渡期 fallback
 */
export async function checkVideoPermission(
  user: { email: string },
  permissions: AiPermissions,
): Promise<{ allowed: boolean; message?: string }> {
  if (permissions.canGenerateVideo) {
    return { allowed: true };
  }

  const config = await getConfig();
  const normalizedEmail = user.email.toLowerCase();
  const inWhitelist = config.videoWhitelist.some((email) => email.toLowerCase() === normalizedEmail);
  if (inWhitelist) {
    return { allowed: true };
  }

  return { allowed: false, message: '您没有权限使用视频生成功能，请联系管理员开通' };
}
