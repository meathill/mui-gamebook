import { defineCloudflareConfig } from '@opennextjs/cloudflare';
import r2IncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache';
import { withRegionalCache } from '@opennextjs/cloudflare/overrides/incremental-cache/regional-cache';
import memoryQueue from '@opennextjs/cloudflare/overrides/queue/memory-queue';
import d1NextTagCache from '@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache';

interface RevalidatingOptions {
  /**
   * 启用 D1 tag cache，让 revalidatePath 按需失效真正生效。
   * 需要 wrangler 配置 NEXT_TAG_CACHE_D1 绑定（deploy 时会自动建 revalidations 表）；
   * 没有 D1 的站点不要开启，否则部署时 populateCache 会因缺绑定而失败。
   */
  tagCache?: boolean;
}

/**
 * 需要 ISR / 按需失效的站点：R2 存增量缓存，同区域 Cache API 减少 R2 读，
 * 并打开 cache interception。后台动态路由靠 private Cache-Control 自然绕开。
 *
 * ISR 的时间型 revalidate 依赖 queue：未配置时会落到 dummy queue，
 * 缓存过期一触发后台重验证就直接抛 FatalError，整页 500。
 * memory queue 只依赖 WORKER_SELF_REFERENCE service binding，重验证内部已自带容错。
 */
export function createRevalidatingOpenNextConfig(options: RevalidatingOptions = {}) {
  return defineCloudflareConfig({
    incrementalCache: withRegionalCache(r2IncrementalCache, { mode: 'long-lived' }),
    enableCacheInterception: true,
    queue: memoryQueue,
    tagCache: options.tagCache ? d1NextTagCache : undefined,
  });
}
