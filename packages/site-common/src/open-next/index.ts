import { defineCloudflareConfig } from '@opennextjs/cloudflare';
import r2IncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache';
import { withRegionalCache } from '@opennextjs/cloudflare/overrides/incremental-cache/regional-cache';

/**
 * 需要 ISR / 按需失效的站点：R2 存增量缓存，同区域 Cache API 减少 R2 读，
 * 并打开 cache interception。后台动态路由靠 private Cache-Control 自然绕开。
 */
export function createRevalidatingOpenNextConfig() {
  return defineCloudflareConfig({
    incrementalCache: withRegionalCache(r2IncrementalCache, { mode: 'long-lived' }),
    enableCacheInterception: true,
  });
}
