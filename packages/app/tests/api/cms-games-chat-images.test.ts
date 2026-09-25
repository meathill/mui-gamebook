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
}));

vi.mock('@/lib/config', () => ({
  getConfig: vi.fn(),
}));

vi.mock('@/lib/user-ai-settings', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/user-ai-settings')>();
  return {
    ...actual,
    getUserAiModelPreference: vi.fn(),
    isPaidAiUser: vi.fn(),
  };
});

vi.mock('@/lib/ai-provider-factory', () => ({
  createAiProvider: vi.fn(),
}));

vi.mock('@/lib/ai-usage', () => ({
  recordAiUsage: vi.fn(),
}));

import { POST } from '@/app/api/cms/games/[id]/chat/route';
import { getUserAiPermissions } from '@/lib/ai-permissions';
import { createAiProvider } from '@/lib/ai-provider-factory';
import { getSession } from '@/lib/auth-server';
import { getConfig } from '@/lib/config';
import { getUserAiModelPreference, isPaidAiUser } from '@/lib/user-ai-settings';
import { getManagedGame } from '@/lib/game-access';
import { checkUserUsageLimit } from '@/lib/usage-limit';

function makeReq(body: unknown) {
  return new Request('http://localhost/api/cms/games/1/chat', { method: 'POST', body: JSON.stringify(body) });
}

function makeParams(id = '1') {
  return { params: Promise.resolve({ id }) };
}

async function readSseEvents(res: Response): Promise<Array<Record<string, unknown>>> {
  const text = await res.text();
  return text
    .split('\n\n')
    .filter((line) => line.startsWith('data: '))
    .map((line) => JSON.parse(line.slice('data: '.length)));
}

const GOOD_IMAGES = [
  'https://cdn.example.com/images/test/chat-1.png',
  'https://cdn.example.com/images/test/chat-2.png',
];

describe('POST /api/cms/games/[id]/chat 参考图校验', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'u1', email: 'u1@example.com' } });
    (checkUserUsageLimit as ReturnType<typeof vi.fn>).mockResolvedValue({ allowed: true });
    (getManagedGame as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 1, slug: 'test', title: 'test' });
    (getUserAiPermissions as ReturnType<typeof vi.fn>).mockResolvedValue({ providers: ['google'] });
    (getConfig as ReturnType<typeof vi.fn>).mockResolvedValue({
      defaultTextProvider: 'google',
      mimoTextModel: 'mimo-v2.5-pro',
      opencodeTextModel: 'deepseek-v4.1-flash',
      googleTextModel: 'gemini-3.8-flash',
      openaiTextModel: 'gpt-5.6-luna',
      anthropicTextModel: 'claude-sonnet-5',
    });
    (getUserAiModelPreference as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (isPaidAiUser as ReturnType<typeof vi.fn>).mockResolvedValue(false);
  });

  it('超过 4 张返回 400', async () => {
    const res = await POST(
      makeReq({ message: '看看', context: {}, history: [], images: ['a', 'b', 'c', 'd', 'e'] }),
      makeParams(),
    );
    expect(res.status).toBe(400);
  });

  it('非本游戏素材 URL 返回 400', async () => {
    const res = await POST(
      makeReq({ message: '看看', context: {}, history: [], images: ['https://evil.com/x.png'] }),
      makeParams(),
    );
    expect(res.status).toBe(400);
  });

  it('合法参考图透传给 provider（多模态）', async () => {
    const chatWithTools = vi.fn().mockResolvedValue({
      text: '收到',
      usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
    });
    (createAiProvider as ReturnType<typeof vi.fn>).mockResolvedValue({ type: 'google', chatWithTools });

    const res = await POST(makeReq({ message: '看看', context: {}, history: [], images: GOOD_IMAGES }), makeParams());

    expect(res.headers.get('Content-Type')).toContain('text/event-stream');
    const sentMessages = chatWithTools.mock.calls[0][0] as Array<{ role: string; content: unknown }>;
    const last = sentMessages[sentMessages.length - 1];
    expect(last.role).toBe('user');
    expect(last.content).toEqual([
      { type: 'text', text: expect.stringContaining('（本次附带 2 张参考图') },
      { type: 'image_url', url: GOOD_IMAGES[0] },
      { type: 'image_url', url: GOOD_IMAGES[1] },
    ]);
    expect(await readSseEvents(res)).toEqual([{ type: 'text', content: '收到' }, { type: 'done' }]);
  });

  it('provider 不支持图片时提示切换（不静默丢图）', async () => {
    const chatWithTools = vi.fn().mockRejectedValue(new Error('unsupported image'));
    (createAiProvider as ReturnType<typeof vi.fn>).mockResolvedValue({ type: 'mimo', chatWithTools });

    const res = await POST(makeReq({ message: '看看', context: {}, history: [], images: GOOD_IMAGES }), makeParams());

    const events = await readSseEvents(res);
    expect(events[0]).toEqual({ type: 'error', content: expect.stringContaining('请切换 provider 重试') });
  });
});
