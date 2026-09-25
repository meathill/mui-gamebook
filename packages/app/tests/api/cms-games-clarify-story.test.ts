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

import { MIMO_FAST_TEXT_MODEL } from '@mui-gamebook/core/lib/mimo-provider';
import { POST } from '@/app/api/cms/games/[id]/clarify-story/route';
import { getUserAiPermissions } from '@/lib/ai-permissions';
import { createAiProvider } from '@/lib/ai-provider-factory';
import { recordAiUsage } from '@/lib/ai-usage';
import { getSession } from '@/lib/auth-server';
import { getConfig } from '@/lib/config';
import { getUserAiModelPreference, isPaidAiUser } from '@/lib/user-ai-settings';
import { getManagedGame } from '@/lib/game-access';
import { checkUserUsageLimit } from '@/lib/usage-limit';

function makeReq(body: unknown) {
  return new Request('http://localhost/api/cms/games/1/clarify-story', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

function makeParams(id = '1') {
  return { params: Promise.resolve({ id }) };
}

describe('POST /api/cms/games/[id]/clarify-story', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'u1', email: 'u1@example.com' } });
    (checkUserUsageLimit as ReturnType<typeof vi.fn>).mockResolvedValue({ allowed: true });
    (getManagedGame as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 1, ownerId: 'u1' });
    (getUserAiPermissions as ReturnType<typeof vi.fn>).mockResolvedValue({ providers: ['mimo'] });
    (getConfig as ReturnType<typeof vi.fn>).mockResolvedValue({
      defaultTextProvider: 'mimo',
      mimoTextModel: 'mimo-v2.5-pro',
      opencodeTextModel: 'deepseek-v4.1-flash',
      googleTextModel: 'gemini-3.8-flash',
      openaiTextModel: 'gpt-5.6-luna',
      anthropicTextModel: 'claude-sonnet-5',
    });
    (getUserAiModelPreference as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (isPaidAiUser as ReturnType<typeof vi.fn>).mockResolvedValue(false);
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

  it('信息不够时返回 ready: false 与追问，mimo 用轻量模型、关闭思考、限定输出上限，用量记为 clarify_questions', async () => {
    const generateText = vi.fn().mockResolvedValue({
      text: '{"ready": false, "questions": ["主角是谁？", "故事发生在哪里？"]}',
      usage: { promptTokens: 20, completionTokens: 15, totalTokens: 35 },
    });
    (createAiProvider as ReturnType<typeof vi.fn>).mockResolvedValue({ type: 'mimo', generateText });

    const res = await POST(makeReq({ story: '一个女孩的故事' }), makeParams());

    expect(res.status).toBe(200);
    const data = (await res.json()) as { ready: boolean; questions: string[] };
    expect(data.ready).toBe(false);
    expect(data.questions).toEqual(['主角是谁？', '故事发生在哪里？']);

    expect(generateText).toHaveBeenCalledTimes(1);
    const [prompt, options] = generateText.mock.calls[0];
    expect(prompt).toContain('一个女孩的故事');
    expect(options).toEqual({ thinking: false, maxOutputTokens: 400, model: MIMO_FAST_TEXT_MODEL });

    expect(recordAiUsage).toHaveBeenCalledWith({
      userId: 'u1',
      type: 'clarify_questions',
      model: MIMO_FAST_TEXT_MODEL,
      usage: { promptTokens: 20, completionTokens: 15, totalTokens: 35 },
      gameId: 1,
    });
  });

  it('信息已足够时返回 ready: true', async () => {
    const generateText = vi.fn().mockResolvedValue({
      text: '{"ready": true, "questions": []}',
      usage: { promptTokens: 20, completionTokens: 5, totalTokens: 25 },
    });
    (createAiProvider as ReturnType<typeof vi.fn>).mockResolvedValue({ type: 'mimo', generateText });

    const res = await POST(makeReq({ story: '一个足够清晰的完整故事设定' }), makeParams());

    expect(res.status).toBe(200);
    const data = (await res.json()) as { ready: boolean; questions: string[] };
    expect(data).toEqual({ ready: true, questions: [] });
  });

  it('非 mimo provider 不传 model 覆盖', async () => {
    (getUserAiPermissions as ReturnType<typeof vi.fn>).mockResolvedValue({ providers: ['anthropic'] });
    (getConfig as ReturnType<typeof vi.fn>).mockResolvedValue({
      defaultTextProvider: 'anthropic',
      mimoTextModel: 'mimo-v2.5-pro',
      opencodeTextModel: 'deepseek-v4.1-flash',
      googleTextModel: 'gemini-3.8-flash',
      openaiTextModel: 'gpt-5.6-luna',
      anthropicTextModel: 'claude-sonnet-5',
    });
    const generateText = vi.fn().mockResolvedValue({
      text: '{"ready": true, "questions": []}',
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
    });
    (createAiProvider as ReturnType<typeof vi.fn>).mockResolvedValue({ type: 'anthropic', generateText });

    await POST(makeReq({ story: '一个女孩的故事' }), makeParams());

    const [, options] = generateText.mock.calls[0];
    expect(options).toEqual({ thinking: false, maxOutputTokens: 400 });
  });

  it('AI 返回内容无法解析时优雅退化为 ready: true（不是报错）', async () => {
    const generateText = vi.fn().mockResolvedValue({
      text: '不是合法 JSON',
      usage: { promptTokens: 5, completionTokens: 5, totalTokens: 10 },
    });
    (createAiProvider as ReturnType<typeof vi.fn>).mockResolvedValue({ type: 'mimo', generateText });

    const res = await POST(makeReq({ story: '一个女孩的故事' }), makeParams());

    expect(res.status).toBe(200);
    const data = (await res.json()) as { ready: boolean; questions: string[] };
    expect(data).toEqual({ ready: true, questions: [] });
  });

  it('provider 创建失败时优雅退化为 ready: true，不阻塞用户', async () => {
    (createAiProvider as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('密钥缺失'));

    const res = await POST(makeReq({ story: '一个女孩的故事' }), makeParams());

    expect(res.status).toBe(200);
    const data = (await res.json()) as { ready: boolean; questions: string[] };
    expect(data).toEqual({ ready: true, questions: [] });
    expect(recordAiUsage).not.toHaveBeenCalled();
  });

  it('从请求头透传 x-opencode-session 与 gameId 给 createAiProvider', async () => {
    const generateText = vi.fn().mockResolvedValue({
      text: '{"ready": true, "questions": []}',
      usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 },
    });
    (createAiProvider as ReturnType<typeof vi.fn>).mockResolvedValue({ type: 'mimo', generateText });

    const req = new Request('http://localhost/api/cms/games/42/clarify-story', {
      method: 'POST',
      headers: {
        'x-opencode-session': 'custom_session_999',
      },
      body: JSON.stringify({ story: 'test' }),
    });

    await POST(req, makeParams('42'));
    expect(createAiProvider).toHaveBeenCalledWith('mimo', {
      sessionId: 'custom_session_999',
      gameId: '42',
      textModel: 'mimo-v2.5-pro',
    });
  });

  it('付费用户自选模型时追问不再强制轻量模型', async () => {
    (getUserAiModelPreference as ReturnType<typeof vi.fn>).mockResolvedValue({
      provider: 'mimo',
      model: 'mimo-v2.5-pro',
    });
    (isPaidAiUser as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    const generateText = vi.fn().mockResolvedValue({
      text: '{"ready": true, "questions": []}',
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
    });
    (createAiProvider as ReturnType<typeof vi.fn>).mockResolvedValue({ type: 'mimo', generateText });

    await POST(makeReq({ story: '一个女孩的故事' }), makeParams());

    expect(createAiProvider).toHaveBeenCalledWith('mimo', {
      sessionId: undefined,
      gameId: '1',
      textModel: 'mimo-v2.5-pro',
    });
    const [, options] = generateText.mock.calls[0];
    expect(options).toEqual({ thinking: false, maxOutputTokens: 400 });
    expect(recordAiUsage).toHaveBeenCalledWith({
      userId: 'u1',
      type: 'clarify_questions',
      model: 'mimo-v2.5-pro',
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      gameId: 1,
    });
  });
});
