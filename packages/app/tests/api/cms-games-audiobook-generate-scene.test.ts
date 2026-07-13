import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  get: vi.fn(),
};

const bucket = {
  put: vi.fn(),
};

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn(() => ({
    env: { DB: {}, ASSETS_BUCKET: bucket, ASSETS_PUBLIC_DOMAIN: 'https://cdn.x.com' },
  })),
}));

vi.mock('drizzle-orm/d1', () => ({
  drizzle: vi.fn(() => mockDb),
}));

vi.mock('@/lib/auth-server', () => ({
  getSession: vi.fn(),
}));

vi.mock('@/lib/game-access', () => ({
  getManagedGame: vi.fn(),
}));

vi.mock('@/lib/usage-limit', () => ({
  checkUserUsageLimit: vi.fn(),
}));

vi.mock('@/lib/ai-usage', () => ({
  recordAiUsage: vi.fn(),
}));

vi.mock('@/lib/ai-provider-factory', () => ({
  createAiProvider: vi.fn(),
}));

// 分段/切句/音色分配都是纯函数，故意不 mock——用一个真实可控的 fake provider
// 驱动，这样测的是路由把这些真实实现接起来是否正确，而不是"我 mock 了什么就
// 断言什么"的空转测试。@mui-gamebook/parser 的 parse() 同理，不 mock。

import { POST } from '@/app/api/cms/games/[id]/audiobook/generate-scene/route';
import { createAiProvider } from '@/lib/ai-provider-factory';
import { recordAiUsage } from '@/lib/ai-usage';
import { getSession } from '@/lib/auth-server';
import { getManagedGame } from '@/lib/game-access';
import { checkUserUsageLimit } from '@/lib/usage-limit';

const SIMPLE_GAME_CONTENT = `---
title: "Test Game"
ai:
  characters:
    mom:
      name: "妈妈"
---
# start
妈妈把点心交给你。

* [直接去外婆家] -> end

# end
到家了。
`;

const DIALOGUE_GAME_CONTENT = `---
title: "Test Game"
ai:
  characters:
    mom:
      name: "妈妈"
---
# start
妈妈把点心交给你。"外婆生病了，"她说。

* [出发] -> end

# end
到家了。
`;

function makeReq(body: unknown) {
  return new Request('http://localhost/api/cms/games/1/audiobook/generate-scene', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

function makeParams(id = '1') {
  return { params: Promise.resolve({ id }) };
}

function makeFakeProvider(overrides: Partial<{ chatWithTools: unknown; generateTTS: unknown }> = {}) {
  return {
    type: 'mimo',
    generateText: vi.fn(),
    generateImage: vi.fn(),
    generateMiniGame: vi.fn(),
    generateTTS: vi.fn(async (text: string) => ({ buffer: Buffer.from(text), mimeType: 'audio/wav' })),
    ...overrides,
  };
}

describe('POST /api/cms/games/[id]/audiobook/generate-scene', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'u1' } });
    (getManagedGame as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 1, slug: 'test-game', ownerId: 'u1' });
    (checkUserUsageLimit as ReturnType<typeof vi.fn>).mockResolvedValue({ allowed: true });
    (createAiProvider as ReturnType<typeof vi.fn>).mockResolvedValue(makeFakeProvider());
    mockDb.get.mockResolvedValue({ content: SIMPLE_GAME_CONTENT });
    bucket.put.mockResolvedValue(undefined);
  });

  it('未登录返回 401', async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await POST(makeReq({ sceneId: 'start' }), makeParams());

    expect(res.status).toBe(401);
  });

  it('游戏不存在或无权限返回 404', async () => {
    (getManagedGame as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await POST(makeReq({ sceneId: 'start' }), makeParams());

    expect(res.status).toBe(404);
  });

  it('用量超限返回 429', async () => {
    (checkUserUsageLimit as ReturnType<typeof vi.fn>).mockResolvedValue({ allowed: false, message: '超限了' });

    const res = await POST(makeReq({ sceneId: 'start' }), makeParams());

    expect(res.status).toBe(429);
  });

  it('缺少 sceneId 返回 400', async () => {
    const res = await POST(makeReq({}), makeParams());

    expect(res.status).toBe(400);
  });

  it('游戏内容不存在返回 404', async () => {
    mockDb.get.mockResolvedValue(null);

    const res = await POST(makeReq({ sceneId: 'start' }), makeParams());

    expect(res.status).toBe(404);
  });

  it('DSL 解析失败返回 500', async () => {
    mockDb.get.mockResolvedValue({ content: '不是合法的 DSL' });

    const res = await POST(makeReq({ sceneId: 'start' }), makeParams());

    expect(res.status).toBe(500);
  });

  it('场景不存在返回 404', async () => {
    const res = await POST(makeReq({ sceneId: 'no-such-scene' }), makeParams());

    expect(res.status).toBe(404);
  });

  it('provider 不支持 TTS 时返回 500', async () => {
    (createAiProvider as ReturnType<typeof vi.fn>).mockResolvedValue(makeFakeProvider({ generateTTS: undefined }));

    const res = await POST(makeReq({ sceneId: 'start' }), makeParams());

    expect(res.status).toBe(500);
  });

  it('纯旁白场景：为文本节点和选项各生成一个 clip，上传到 R2，记录用量，并写入场景 fragment', async () => {
    const res = await POST(makeReq({ sceneId: 'start' }), makeParams());

    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      sceneId: string;
      clips: Array<{ speaker: string; voice: string; text: string; url: string }>;
    };

    expect(data.sceneId).toBe('start');
    expect(data.clips).toHaveLength(2);
    expect(data.clips[0]).toMatchObject({ speaker: 'narrator', text: '妈妈把点心交给你。' });
    expect(data.clips[1]).toMatchObject({ speaker: 'narrator', text: '直接去外婆家' });
    expect(data.clips.every((clip) => clip.url.startsWith('https://cdn.x.com/audiobook/test-game/clips/'))).toBe(true);

    // 两个 clip 各自上传一次，加上最后场景 fragment 一次
    expect(bucket.put).toHaveBeenCalledTimes(3);
    const fragmentCall = bucket.put.mock.calls.find((call) => (call[0] as string).endsWith('scenes/start.json'));
    expect(fragmentCall).toBeDefined();
    expect(JSON.parse(fragmentCall![1] as string)).toEqual(data);

    // 无引号内容不需要分段 LLM 调用，只会记 audio_generation 用量，不会有 chat 用量
    const usageCalls = (recordAiUsage as ReturnType<typeof vi.fn>).mock.calls.map((call) => call[0]);
    expect(usageCalls.every((call) => call.type === 'audio_generation')).toBe(true);
    expect(usageCalls).toHaveLength(2);
  });

  it('含对白的场景：分段后按角色分配不同音色，且记录一次 chat 用量', async () => {
    mockDb.get.mockResolvedValue({ content: DIALOGUE_GAME_CONTENT });
    const chatWithTools = vi.fn(async () => ({
      functionCalls: [
        {
          name: 'submitSegments',
          args: {
            segments: [
              { speaker: 'narrator', text: '妈妈把点心交给你。' },
              { speaker: 'mom', text: '"外婆生病了，"她说。' },
            ],
          },
        },
      ],
      usage: { promptTokens: 20, completionTokens: 10, totalTokens: 30 },
    }));
    (createAiProvider as ReturnType<typeof vi.fn>).mockResolvedValue(makeFakeProvider({ chatWithTools }));

    const res = await POST(makeReq({ sceneId: 'start' }), makeParams());

    expect(res.status).toBe(200);
    const data = (await res.json()) as { clips: Array<{ speaker: string; voice: string }> };

    // 2 句来自文本节点的分段结果 + 1 句选项 = 3 个 clip
    expect(data.clips).toHaveLength(3);
    expect(data.clips[0].speaker).toBe('narrator');
    expect(data.clips[1].speaker).toBe('mom');
    expect(data.clips[1].voice).not.toBe(data.clips[0].voice);
    expect(chatWithTools).toHaveBeenCalledTimes(1);

    const usageTypes = (recordAiUsage as ReturnType<typeof vi.fn>).mock.calls.map((call) => call[0].type);
    expect(usageTypes.filter((type) => type === 'chat')).toHaveLength(1);
    expect(usageTypes.filter((type) => type === 'audio_generation')).toHaveLength(3);
  });

  it('TTS 调用失败时返回 500', async () => {
    (createAiProvider as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeFakeProvider({ generateTTS: vi.fn().mockRejectedValue(new Error('TTS 挂了')) }),
    );

    const res = await POST(makeReq({ sceneId: 'start' }), makeParams());

    expect(res.status).toBe(500);
  });
});
