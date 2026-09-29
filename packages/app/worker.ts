// OpenNext 自定义 Worker 入口（wrangler.jsonc `main`）：
// 复用生成的 .open-next/worker.js，出口统一写 Workers Cache 边缘缓存策略（issue #22）。
// 用 alias `open-next-generated-worker` 引生成产物，避免 TS 把 14MB handler 拉进类型检查。
// @ts-ignore 仅 wrangler 打包时可解析
import { default as handler } from 'open-next-generated-worker';
import { applyEdgeCachePolicy, type EdgeCacheContext } from './src/lib/workers-cache';

export default {
  async fetch(request: Request, env: unknown, ctx: EdgeCacheContext): Promise<Response> {
    const response: Response = await handler.fetch(request, env, ctx);
    return applyEdgeCachePolicy(request, response);
  },
};

// memory queue 不需要 DO；若日后改 doQueue，在此 re-export DOQueueHandler。
