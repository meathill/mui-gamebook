import { describe, expect, it, vi } from 'vitest';
import worker from '../src/index';

function makeEnv(mainAppFetch: typeof fetch) {
  return {
    MAIN_APP: { fetch: mainAppFetch } as unknown as Fetcher,
    CRON_SECRET: 'secret-123',
  } as unknown as CloudflareEnv;
}

describe('cronjob worker', () => {
  it('GET /sync-analytics 成功时返回 success:true', async () => {
    const mainAppFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ synced: 5 }), { status: 200 }));
    const env = makeEnv(mainAppFetch);

    const res = await worker.fetch(new Request('https://cron.example.com/sync-analytics'), env);
    const body = (await res.json()) as { success: boolean; message: string };

    expect(body.success).toBe(true);
    expect(JSON.parse(body.message)).toEqual({ synced: 5 });
    expect(mainAppFetch).toHaveBeenCalledWith(
      'https://internal/api/cron/sync-analytics',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer secret-123' }),
      }),
    );
  });

  it('主应用返回非 ok 响应时返回 success:false 但 HTTP 状态仍是 200（已在内部捕获）', async () => {
    const mainAppFetch = vi.fn().mockResolvedValue(new Response('upstream error', { status: 500 }));
    const env = makeEnv(mainAppFetch);

    const res = await worker.fetch(new Request('https://cron.example.com/sync-analytics'), env);
    const body = (await res.json()) as { success: boolean; message: string };

    expect(res.status).toBe(200);
    expect(body).toEqual({ success: false, message: 'upstream error' });
  });

  it('Service Binding 调用抛出网络异常时返回 success:false', async () => {
    const mainAppFetch = vi.fn().mockRejectedValue(new Error('network down'));
    const env = makeEnv(mainAppFetch);

    const res = await worker.fetch(new Request('https://cron.example.com/sync-analytics'), env);
    const body = (await res.json()) as { success: boolean; message: string };

    expect(body).toEqual({ success: false, message: 'Error: network down' });
  });

  it('未知路径返回服务信息', async () => {
    const env = makeEnv(vi.fn());

    const res = await worker.fetch(new Request('https://cron.example.com/'), env);
    const body = (await res.json()) as { name: string; endpoints: string[] };

    expect(body).toEqual({ name: 'mui-gamebook-cron', endpoints: ['/sync-analytics'] });
  });

  it('scheduled 触发时通过 ctx.waitUntil 异步执行同步任务', async () => {
    const mainAppFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ synced: 1 }), { status: 200 }));
    const env = makeEnv(mainAppFetch);
    const waitUntil = vi.fn();
    const ctx = { waitUntil } as unknown as ExecutionContext;
    const controller = { scheduledTime: Date.now() } as ScheduledController;

    await worker.scheduled(controller, env, ctx);

    expect(waitUntil).toHaveBeenCalledTimes(1);
    await waitUntil.mock.calls[0][0];
    expect(mainAppFetch).toHaveBeenCalledTimes(1);
  });
});
