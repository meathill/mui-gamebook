/**
 * MUI Gamebook Cron Worker
 * 独立的定时任务处理器
 *
 * 通过 Service Binding 调用主应用 API
 */

export default {
  /**
   * Scheduled handler - Cloudflare Cron Trigger 入口
   */
  async scheduled(controller: ScheduledController, env: CloudflareEnv, ctx: ExecutionContext): Promise<void> {
    console.log(`Cron triggered at ${new Date(controller.scheduledTime).toISOString()}`);

    // 同步统计数据
    ctx.waitUntil(syncAnalytics(env));
  },

  /**
   * HTTP handler - 用于手动触发或调试
   */
  async fetch(request: Request, env: CloudflareEnv): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/sync-analytics') {
      try {
        const result = await syncAnalytics(env);
        return new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: String(error) }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(
      JSON.stringify({
        name: 'mui-gamebook-cron',
        endpoints: ['/sync-analytics'],
      }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  },
};

/**
 * 同步统计数据：从 KV 到 D1
 */
async function syncAnalytics(env: CloudflareEnv): Promise<{ success: boolean; message: string }> {
  console.log('Starting analytics sync...');

  try {
    // 通过 Service Binding 调用主应用的 sync API
    const response = await env.MAIN_APP.fetch('https://internal/api/cron/sync-analytics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.CRON_SECRET}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Sync failed:', error);
      return { success: false, message: error };
    }

    const result = await response.json();
    console.log('Sync completed:', result);
    return { success: true, message: JSON.stringify(result) };
  } catch (error) {
    console.error('Sync error:', error);
    return { success: false, message: String(error) };
  }
}
