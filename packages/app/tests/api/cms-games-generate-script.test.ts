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

import { POST } from '@/app/api/cms/games/[id]/generate-script/route';
import { getUserAiPermissions, resolveTextProvider } from '@/lib/ai-permissions';
import { createAiProvider } from '@/lib/ai-provider-factory';
import { recordAiUsage } from '@/lib/ai-usage';
import { getSession } from '@/lib/auth-server';
import { getManagedGame } from '@/lib/game-access';
import { checkUserUsageLimit } from '@/lib/usage-limit';

const VALID_SCRIPT = `---
title: "测试游戏"
state:
  health: 100
ai:
  characters:
    hero:
      name: 英雄
---
# start
开始场景。
`;

const INCOMPLETE_SCRIPT = `# start
没有 frontmatter，缺角色和属性。
`;

function makeReq(body: unknown) {
  return new Request('http://localhost/api/cms/games/1/generate-script', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

function makeParams(id = '1') {
  return { params: Promise.resolve({ id }) };
}

/** 读取 SSE 响应体，解析出全部 data 事件（route 用这种格式替代一次性 JSON） */
async function readSseEvents(res: Response): Promise<Record<string, unknown>[]> {
  const reader = res.body?.getReader();
  if (!reader) throw new Error('响应没有 body');

  const decoder = new TextDecoder();
  const events: Record<string, unknown>[] = [];
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      events.push(JSON.parse(line.slice(6)));
    }
  }

  return events;
}

describe('POST /api/cms/games/[id]/generate-script', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ text: () => Promise.resolve('# DSL SPEC placeholder') }));
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'u1' } });
    (checkUserUsageLimit as ReturnType<typeof vi.fn>).mockResolvedValue({ allowed: true });
    (getManagedGame as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 1, ownerId: 'u1' });
    (getUserAiPermissions as ReturnType<typeof vi.fn>).mockResolvedValue({ providers: ['mimo'] });
    (resolveTextProvider as ReturnType<typeof vi.fn>).mockReturnValue('mimo');
  });

  it('未登录返回 401', async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await POST(makeReq({ story: 's' }), makeParams());

    expect(res.status).toBe(401);
  });

  it('用量超限返回 429', async () => {
    (checkUserUsageLimit as ReturnType<typeof vi.fn>).mockResolvedValue({ allowed: false, message: '超限了' });

    const res = await POST(makeReq({ story: 's' }), makeParams());

    expect(res.status).toBe(429);
  });

  it('缺少 story 返回 400', async () => {
    const res = await POST(makeReq({}), makeParams());

    expect(res.status).toBe(400);
  });

  it('游戏不存在或无权限返回 404', async () => {
    (getManagedGame as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await POST(makeReq({ story: 's' }), makeParams());

    expect(res.status).toBe(404);
  });

  it('一次生成即通过校验：不触发纠错重生成', async () => {
    const generateText = vi.fn().mockResolvedValue({
      text: VALID_SCRIPT,
      usage: { promptTokens: 100, completionTokens: 200, totalTokens: 300 },
    });
    (createAiProvider as ReturnType<typeof vi.fn>).mockResolvedValue({ type: 'mimo', generateText });

    const res = await POST(makeReq({ story: '一个关于英雄的故事' }), makeParams());

    expect(res.status).toBe(200);
    const events = await readSseEvents(res);
    expect(generateText).toHaveBeenCalledTimes(1);
    const doneEvent = events.find((e) => e.type === 'done');
    expect(doneEvent?.script).toBe(VALID_SCRIPT);
    expect(recordAiUsage).toHaveBeenCalledWith({
      userId: 'u1',
      type: 'text_generation',
      model: 'mimo',
      usage: { promptTokens: 100, completionTokens: 200, totalTokens: 300 },
      gameId: 1,
    });
  });

  it('首次生成校验未通过时触发一次纠错重生成，用量按两次调用累加', async () => {
    const generateText = vi
      .fn()
      .mockResolvedValueOnce({
        text: INCOMPLETE_SCRIPT,
        usage: { promptTokens: 100, completionTokens: 200, totalTokens: 300 },
      })
      .mockResolvedValueOnce({
        text: VALID_SCRIPT,
        usage: { promptTokens: 50, completionTokens: 80, totalTokens: 130 },
      });
    (createAiProvider as ReturnType<typeof vi.fn>).mockResolvedValue({ type: 'mimo', generateText });

    const res = await POST(makeReq({ story: '一个关于英雄的故事' }), makeParams());

    expect(res.status).toBe(200);
    const events = await readSseEvents(res);
    expect(generateText).toHaveBeenCalledTimes(2);
    expect(events).toContainEqual({ type: 'phase', phase: 'correcting' });
    const doneEvent = events.find((e) => e.type === 'done');
    expect(doneEvent?.script).toBe(VALID_SCRIPT);
    expect(recordAiUsage).toHaveBeenCalledWith({
      userId: 'u1',
      type: 'text_generation',
      model: 'mimo',
      usage: { promptTokens: 150, completionTokens: 280, totalTokens: 430 },
      gameId: 1,
    });
  });

  it('纠错重生成后仍无法解析时保留第一版剧本', async () => {
    const stillBroken = '不是合法 markdown 也没有 scene';
    const generateText = vi
      .fn()
      .mockResolvedValueOnce({
        text: INCOMPLETE_SCRIPT,
        usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 },
      })
      .mockResolvedValueOnce({
        text: stillBroken,
        usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 },
      });
    (createAiProvider as ReturnType<typeof vi.fn>).mockResolvedValue({ type: 'mimo', generateText });

    const res = await POST(makeReq({ story: 's' }), makeParams());

    expect(res.status).toBe(200);
    const events = await readSseEvents(res);
    const doneEvent = events.find((e) => e.type === 'done');
    expect(doneEvent?.script).toBe(INCOMPLETE_SCRIPT);
  });

  it('provider 创建失败时返回 500', async () => {
    (createAiProvider as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('密钥缺失'));

    const res = await POST(makeReq({ story: 's' }), makeParams());

    expect(res.status).toBe(500);
    expect(recordAiUsage).not.toHaveBeenCalled();
  });

  it('带 existingScript 时走"修改剧本"提示词，附上现有剧本全文', async () => {
    const generateText = vi.fn().mockResolvedValue({
      text: VALID_SCRIPT,
      usage: { promptTokens: 100, completionTokens: 200, totalTokens: 300 },
    });
    (createAiProvider as ReturnType<typeof vi.fn>).mockResolvedValue({ type: 'mimo', generateText });

    const existingScript = '# start\n这是现有剧本的场景内容';
    const res = await POST(makeReq({ story: '想加一个新角色', existingScript }), makeParams());

    expect(res.status).toBe(200);
    await readSseEvents(res);
    const [firstPassPrompt] = generateText.mock.calls[0];
    expect(firstPassPrompt).toContain(existingScript);
    expect(firstPassPrompt).toContain('REVISED');
  });

  it('不带 existingScript 时走"从零生成"提示词', async () => {
    const generateText = vi.fn().mockResolvedValue({
      text: VALID_SCRIPT,
      usage: { promptTokens: 100, completionTokens: 200, totalTokens: 300 },
    });
    (createAiProvider as ReturnType<typeof vi.fn>).mockResolvedValue({ type: 'mimo', generateText });

    const res = await POST(makeReq({ story: '一个关于英雄的故事' }), makeParams());

    expect(res.status).toBe(200);
    await readSseEvents(res);
    const [firstPassPrompt] = generateText.mock.calls[0];
    expect(firstPassPrompt).not.toContain('REVISED');
  });
});
