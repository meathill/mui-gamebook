import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn(() => ({ env: { DB: {} } })),
}));

vi.mock('drizzle-orm/d1', () => ({
  drizzle: vi.fn(() => ({})),
}));

vi.mock('@/lib/auth-server', () => ({
  getSession: vi.fn(),
}));

vi.mock('@/lib/usage-limit', () => ({
  checkUserUsageLimit: vi.fn(),
}));

vi.mock('@/lib/game-access', () => ({
  getManagedGame: vi.fn(),
}));

vi.mock('@/lib/ai-permissions', () => ({
  getUserAiPermissions: vi.fn(),
  resolveTextProvider: vi.fn(),
}));

vi.mock('@/lib/ai-provider-factory', () => ({
  createAiProvider: vi.fn(),
}));

vi.mock('@/lib/ai-usage', () => ({
  recordAiUsage: vi.fn(),
}));

import { POST } from '@/app/api/cms/games/[id]/chat/route';
import { getUserAiPermissions, resolveTextProvider } from '@/lib/ai-permissions';
import { createAiProvider } from '@/lib/ai-provider-factory';
import { recordAiUsage } from '@/lib/ai-usage';
import { getSession } from '@/lib/auth-server';
import { getManagedGame } from '@/lib/game-access';
import { checkUserUsageLimit } from '@/lib/usage-limit';

function makeReq(body: unknown) {
  return new Request('http://localhost/api/cms/games/1/chat', { method: 'POST', body: JSON.stringify(body) });
}

function makeParams(id = '1') {
  return { params: Promise.resolve({ id }) };
}

/** 把 SSE 响应体读成一行行 `data: {...}` 解析后的事件对象数组 */
async function readSseEvents(res: Response): Promise<Array<Record<string, unknown>>> {
  const text = await res.text();
  return text
    .split('\n\n')
    .filter((line) => line.startsWith('data: '))
    .map((line) => JSON.parse(line.slice('data: '.length)));
}

describe('POST /api/cms/games/[id]/chat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'u1' } });
    (checkUserUsageLimit as ReturnType<typeof vi.fn>).mockResolvedValue({ allowed: true });
    (getManagedGame as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 1, ownerId: 'u1' });
    (getUserAiPermissions as ReturnType<typeof vi.fn>).mockResolvedValue({ providers: ['mimo'] });
    (resolveTextProvider as ReturnType<typeof vi.fn>).mockReturnValue('mimo');
  });

  const baseBody = { message: '帮我加一个场景', context: {}, history: [] };

  it('未登录返回 401', async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await POST(makeReq(baseBody), makeParams());

    expect(res.status).toBe(401);
  });

  it('用量超限返回 429', async () => {
    (checkUserUsageLimit as ReturnType<typeof vi.fn>).mockResolvedValue({ allowed: false, message: '超限了' });

    const res = await POST(makeReq(baseBody), makeParams());

    expect(res.status).toBe(429);
  });

  it('缺少 message 返回 400', async () => {
    const res = await POST(makeReq({ ...baseBody, message: '' }), makeParams());

    expect(res.status).toBe(400);
  });

  it('游戏不存在或无权限返回 404', async () => {
    (getManagedGame as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await POST(makeReq(baseBody), makeParams());

    expect(res.status).toBe(404);
  });

  it('provider 创建失败时在进入 SSE 前返回 JSON 500', async () => {
    (createAiProvider as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('密钥缺失'));

    const res = await POST(makeReq(baseBody), makeParams());

    expect(res.status).toBe(500);
    expect(res.headers.get('Content-Type')).not.toContain('text/event-stream');
  });

  it('成功路径：文本回复走 SSE，记录用量', async () => {
    const chatWithTools = vi.fn().mockResolvedValue({
      text: '好的，已经理解你的需求',
      usage: { promptTokens: 20, completionTokens: 30, totalTokens: 50 },
    });
    (createAiProvider as ReturnType<typeof vi.fn>).mockResolvedValue({ type: 'mimo', chatWithTools });

    const res = await POST(makeReq(baseBody), makeParams());

    expect(res.headers.get('Content-Type')).toContain('text/event-stream');
    const events = await readSseEvents(res);
    expect(events).toEqual([{ type: 'text', content: '好的，已经理解你的需求' }, { type: 'done' }]);
    expect(recordAiUsage).toHaveBeenCalledWith({
      userId: 'u1',
      type: 'chat',
      model: 'mimo',
      usage: { promptTokens: 20, completionTokens: 30, totalTokens: 50 },
      gameId: 1,
    });
  });

  it('成功路径：function call 回复逐条推送', async () => {
    const chatWithTools = vi.fn().mockResolvedValue({
      functionCalls: [
        { name: 'addScene', args: { id: 'forest' } },
        { name: 'setVariable', args: { key: 'health', value: 100 } },
      ],
      usage: { promptTokens: 5, completionTokens: 5, totalTokens: 10 },
    });
    (createAiProvider as ReturnType<typeof vi.fn>).mockResolvedValue({ type: 'mimo', chatWithTools });

    const res = await POST(makeReq(baseBody), makeParams());

    const events = await readSseEvents(res);
    expect(events).toEqual([
      { type: 'function_call', name: 'addScene', args: { id: 'forest' } },
      { type: 'function_call', name: 'setVariable', args: { key: 'health', value: 100 } },
      { type: 'done' },
    ]);
  });

  it('既没有文本也没有 function call 时推送 error 事件后仍 done', async () => {
    const chatWithTools = vi
      .fn()
      .mockResolvedValue({ usage: { promptTokens: 1, completionTokens: 0, totalTokens: 1 } });
    (createAiProvider as ReturnType<typeof vi.fn>).mockResolvedValue({ type: 'mimo', chatWithTools });

    const res = await POST(makeReq(baseBody), makeParams());

    const events = await readSseEvents(res);
    expect(events).toEqual([{ type: 'error', content: '无法获取 AI 响应' }, { type: 'done' }]);
  });

  it('provider 不支持 chatWithTools 时推送 error 事件，不记录用量', async () => {
    (createAiProvider as ReturnType<typeof vi.fn>).mockResolvedValue({ type: 'mimo' });

    const res = await POST(makeReq(baseBody), makeParams());

    const events = await readSseEvents(res);
    expect(events).toEqual([{ type: 'error', content: '当前 AI 提供者不支持 function calling' }]);
    expect(recordAiUsage).not.toHaveBeenCalled();
  });

  it('chatWithTools 调用抛错时推送 error 事件', async () => {
    const chatWithTools = vi.fn().mockRejectedValue(new Error('网络超时'));
    (createAiProvider as ReturnType<typeof vi.fn>).mockResolvedValue({ type: 'mimo', chatWithTools });

    const res = await POST(makeReq(baseBody), makeParams());

    const events = await readSseEvents(res);
    expect(events).toEqual([{ type: 'error', content: '网络超时' }]);
    expect(recordAiUsage).not.toHaveBeenCalled();
  });
});
