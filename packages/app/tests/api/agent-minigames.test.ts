import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn(),
  get: vi.fn(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn(),
};

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn(() => ({ env: { DB: {}, ADMIN_PASSWORD: 'test-secret' } })),
}));

vi.mock('drizzle-orm/d1', () => ({
  drizzle: vi.fn(() => mockDb),
}));

import { POST } from '@/app/api/agent/minigames/route';

function makeReq(body: unknown, authHeader = 'Bearer test-secret') {
  return new Request('http://localhost/api/agent/minigames', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { Authorization: authHeader },
  });
}

const validMinigame = { name: 'quiz', prompt: '做一个问答小游戏', code: 'console.log(1)' };

describe('POST /api/agent/minigames', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.limit.mockResolvedValue([{ id: 'first-user' }]);
  });

  it('密钥错误返回 401', async () => {
    const res = await POST(makeReq(validMinigame, 'Bearer wrong'));

    expect(res.status).toBe(401);
  });

  it('空数组返回 400', async () => {
    const res = await POST(makeReq([]));

    expect(res.status).toBe(400);
  });

  it('指定的 ownerId 不存在时返回 400', async () => {
    mockDb.get.mockResolvedValueOnce(null);

    const res = await POST(makeReq({ ...validMinigame, ownerId: 'no-such-user' }));

    expect(res.status).toBe(400);
  });

  it('缺少必填字段的条目被跳过，不阻断其他条目', async () => {
    mockDb.get.mockResolvedValueOnce(null); // 第二条的 existing 检查
    mockDb.returning.mockResolvedValueOnce([{ id: 1 }]);

    const res = await POST(makeReq([{ name: 'broken' }, validMinigame]));

    expect(res.status).toBe(200);
    const data = (await res.json()) as { results: Array<{ action: string }> };
    expect(data.results[0].action).toContain('skipped');
    expect(data.results[1].action).toBe('created');
  });

  it('不存在同名小游戏时新建', async () => {
    mockDb.get.mockResolvedValueOnce(null);
    mockDb.returning.mockResolvedValueOnce([{ id: 5 }]);

    const res = await POST(makeReq(validMinigame));

    expect(res.status).toBe(200);
    const data = (await res.json()) as { results: Array<{ id: number; action: string }> };
    expect(data.results).toEqual([{ id: 5, name: 'quiz', action: 'created' }]);
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it('已存在同名小游戏（同一 owner）时更新', async () => {
    mockDb.get.mockResolvedValueOnce({ id: 5 });

    const res = await POST(makeReq(validMinigame));

    expect(res.status).toBe(200);
    const data = (await res.json()) as { results: Array<{ id: number; action: string }> };
    expect(data.results).toEqual([{ id: 5, name: 'quiz', action: 'updated' }]);
    expect(mockDb.update).toHaveBeenCalled();
  });
});
