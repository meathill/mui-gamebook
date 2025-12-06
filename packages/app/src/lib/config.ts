import { getCloudflareContext } from '@opennextjs/cloudflare';

// 默认配置
const DEFAULT_CONFIG = {
  // 普通用户每日 AI token 上限（默认 100000 tokens）
  dailyTokenLimit: 100000,
  // 管理员用户（无限制）
  adminUserIds: [] as string[],
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
