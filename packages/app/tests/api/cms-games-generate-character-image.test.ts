import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  get: vi.fn(),
};

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn(() => ({ env: { DB: {} } })),
}));

vi.mock('drizzle-orm/d1', () => ({
  drizzle: vi.fn(() => mockDb),
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

vi.mock('@/lib/ai-service', () => ({
  generateAndUploadImage: vi.fn(),
}));

vi.mock('@/lib/ai-usage', () => ({
  recordAiUsage: vi.fn(),
}));

import { POST } from '@/app/api/cms/games/[id]/generate-character-image/route';
import { getUserAiPermissions } from '@/lib/ai-permissions';
import { generateAndUploadImage } from '@/lib/ai-service';
import { recordAiUsage } from '@/lib/ai-usage';
import { getSession } from '@/lib/auth-server';
import { getManagedGame } from '@/lib/game-access';
import { checkUserUsageLimit } from '@/lib/usage-limit';

function makeReq(body: unknown) {
  return new Request('http://localhost/api/cms/games/1/generate-character-image', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

function makeParams(id = '1') {
  return { params: Promise.resolve({ id }) };
}

describe('POST /api/cms/games/[id]/generate-character-image', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'u1' } });
    (checkUserUsageLimit as ReturnType<typeof vi.fn>).mockResolvedValue({ allowed: true });
    (getUserAiPermissions as ReturnType<typeof vi.fn>).mockResolvedValue({ canGenerateImage: true });
    (getManagedGame as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 1, slug: 'my-game', title: '我的游戏' });
    mockDb.get.mockResolvedValue(null);
  });

  it('未登录返回 401', async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await POST(makeReq({ characterId: 'c1', prompt: 'p' }), makeParams());

    expect(res.status).toBe(401);
  });

  it('用量超限返回 429', async () => {
    (checkUserUsageLimit as ReturnType<typeof vi.fn>).mockResolvedValue({ allowed: false, message: '超限了' });

    const res = await POST(makeReq({ characterId: 'c1', prompt: 'p' }), makeParams());

    expect(res.status).toBe(429);
  });

  it('缺少 characterId/prompt 返回 400', async () => {
    const res = await POST(makeReq({}), makeParams());

    expect(res.status).toBe(400);
  });

  it('没有生图权限返回 403', async () => {
    (getUserAiPermissions as ReturnType<typeof vi.fn>).mockResolvedValue({ canGenerateImage: false });

    const res = await POST(makeReq({ characterId: 'c1', prompt: 'p' }), makeParams());

    expect(res.status).toBe(403);
  });

  it('游戏不存在或无权限返回 404', async () => {
    (getManagedGame as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await POST(makeReq({ characterId: 'c1', prompt: 'p' }), makeParams());

    expect(res.status).toBe(404);
  });

  it('成功路径：拼接风格提示词并记录用量', async () => {
    mockDb.get.mockResolvedValue({
      content: '---\ntitle: "测试游戏"\nai:\n  style:\n    image: "watercolor style"\n---\n# start\nhi\n',
    });
    (generateAndUploadImage as ReturnType<typeof vi.fn>).mockResolvedValue({
      url: 'https://cdn.x.com/images/my-game/characters/c1-1.png',
      usage: { promptTokens: 3, completionTokens: 0, totalTokens: 3 },
      model: 'google',
    });

    const res = await POST(makeReq({ characterId: 'c1', prompt: '微笑的少年' }), makeParams());

    expect(res.status).toBe(200);
    expect(generateAndUploadImage).toHaveBeenCalledWith(
      'watercolor style, character portrait, 微笑的少年',
      expect.stringContaining('images/my-game/characters/c1-'),
    );
    expect(recordAiUsage).toHaveBeenCalledWith({
      userId: 'u1',
      type: 'image_generation',
      model: 'google',
      usage: { promptTokens: 3, completionTokens: 0, totalTokens: 3 },
      gameId: 1,
    });
  });

  it('游戏内容没有 ai.style.image 时不拼接风格前缀', async () => {
    mockDb.get.mockResolvedValue({ content: '# start\nhi\n' });
    (generateAndUploadImage as ReturnType<typeof vi.fn>).mockResolvedValue({
      url: 'https://cdn.x.com/x.png',
      usage: { promptTokens: 1, completionTokens: 0, totalTokens: 1 },
      model: 'google',
    });

    await POST(makeReq({ characterId: 'c1', prompt: '微笑的少年' }), makeParams());

    expect(generateAndUploadImage).toHaveBeenCalledWith('character portrait, 微笑的少年', expect.any(String));
  });

  it('生成失败时返回 500', async () => {
    (generateAndUploadImage as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('生成失败'));

    const res = await POST(makeReq({ characterId: 'c1', prompt: 'p' }), makeParams());

    expect(res.status).toBe(500);
    expect(recordAiUsage).not.toHaveBeenCalled();
  });
});
