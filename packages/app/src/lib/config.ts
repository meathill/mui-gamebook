import { getCloudflareContext } from '@opennextjs/cloudflare';

// 默认配置
const DEFAULT_CONFIG = {
  // 普通用户每日 AI token 上限（默认 100000 tokens）
  dailyTokenLimit: 100000,
  // 管理员用户（无限制）
  adminUserIds: [] as string[],
  // 允许生成视频的用户邮箱白名单
  videoWhitelist: [] as string[],
};

export type AppConfig = typeof DEFAULT_CONFIG;

const CONFIG_KEY = 'app:config';

/**
 * 获取全局配置
 * 优先从 KV 读取，如果不存在则使用默认配置
 */
export async function getConfig(): Promise<AppConfig> {
  try {
    const { env } = getCloudflareContext();
    const kv = env.KV;
    
    const stored = await kv.get<AppConfig>(CONFIG_KEY, 'json');
    if (stored) {
      return { ...DEFAULT_CONFIG, ...stored };
    }
    
    return DEFAULT_CONFIG;
  } catch (error) {
    console.error('[Config] 获取配置失败:', error);
    return DEFAULT_CONFIG;
  }
}

/**
 * 更新全局配置
 */
export async function updateConfig(config: Partial<AppConfig>): Promise<void> {
  try {
    const { env } = getCloudflareContext();
    const kv = env.KV;
    
    const current = await getConfig();
    const newConfig = { ...current, ...config };
    
    await kv.put(CONFIG_KEY, JSON.stringify(newConfig));
    console.log('[Config] 配置已更新:', newConfig);
  } catch (error) {
    console.error('[Config] 更新配置失败:', error);
    throw error;
  }
}

/**
 * 检查用户是否有权限生成视频
 * 只有白名单中的用户才能生成视频
 */
export async function checkVideoGenerationPermission(userEmail: string | null | undefined): Promise<{
  allowed: boolean;
  message?: string;
}> {
  if (!userEmail) {
    return { allowed: false, message: '无法获取用户邮箱' };
  }

  const config = await getConfig();
  
  // 如果白名单为空，则不允许任何人使用
  if (!config.videoWhitelist || config.videoWhitelist.length === 0) {
    return { allowed: false, message: '视频生成功能暂未开放' };
  }
  
  // 检查用户邮箱是否在白名单中（不区分大小写）
  const normalizedEmail = userEmail.toLowerCase();
  const isAllowed = config.videoWhitelist.some(
    (email) => email.toLowerCase() === normalizedEmail
  );
  
  if (!isAllowed) {
    return { allowed: false, message: '您没有权限使用视频生成功能' };
  }
  
  return { allowed: true };
}
