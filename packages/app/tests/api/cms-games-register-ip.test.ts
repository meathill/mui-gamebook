import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
};

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn(() => ({
    env: { DB: {}, STORY_PRIVATE_KEY: 'deadbeef', PINATA_JWT: 'jwt-token' },
  })),
}));

vi.mock('drizzle-orm/d1', () => ({
  drizzle: vi.fn(() => mockDb),
}));

vi.mock('@/lib/auth-server', () => ({
  getSession: vi.fn(),
}));

vi.mock('@/lib/story-protocol', () => ({
  createStoryClient: vi.fn(),
  uploadMetadataToIpfs: vi.fn(),
  registerGameAsIp: vi.fn(),
}));

import type { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/cms/games/[id]/register-ip/route';
import { getSession } from '@/lib/auth-server';
import { createStoryClient, registerGameAsIp, uploadMetadataToIpfs } from '@/lib/story-protocol';

function makeParams(id = '1') {
  return { params: Promise.resolve({ id }) };
}

const gameRow = { id: 1, title: '小红帽', ownerId: 'u1', description: null, coverImage: null, ipId: null };

describe('POST /api/cms/games/[id]/register-ip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'u1' } });
    mockDb.limit.mockReset();
  });

  it('未登录返回 401', async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await POST({} as unknown as NextRequest, makeParams());

    expect(res.status).toBe(401);
  });

  it('无效游戏 ID 返回 400', async () => {
    const res = await POST({} as unknown as NextRequest, makeParams('not-a-number'));

    expect(res.status).toBe(400);
  });

  it('游戏不存在返回 404', async () => {
    mockDb.limit.mockResolvedValueOnce([]);

    const res = await POST({} as unknown as NextRequest, makeParams());

    expect(res.status).toBe(404);
  });

  it('不是游戏所有者返回 403', async () => {
    mockDb.limit.mockResolvedValueOnce([{ ...gameRow, ownerId: 'someone-else' }]);

    const res = await POST({} as unknown as NextRequest, makeParams());

    expect(res.status).toBe(403);
  });

  it('游戏已注册过 IP 时返回 400，附带已有的 ipId', async () => {
    mockDb.limit.mockResolvedValueOnce([{ ...gameRow, ipId: '0xExisting' }]);

    const res = await POST({} as unknown as NextRequest, makeParams());

    expect(res.status).toBe(400);
    const data = (await res.json()) as { ipId: string };
    expect(data.ipId).toBe('0xExisting');
  });

  it('成功路径：上传元数据、注册 IP、更新数据库', async () => {
    mockDb.limit
      .mockResolvedValueOnce([gameRow])
      .mockResolvedValueOnce([{ id: 'u1', name: 'Meathill', email: 'a@b.com' }]);
    const storyClient = {};
    (createStoryClient as ReturnType<typeof vi.fn>).mockReturnValue({ storyClient });
    (uploadMetadataToIpfs as ReturnType<typeof vi.fn>).mockResolvedValue('ipfs://Qm123');
    (registerGameAsIp as ReturnType<typeof vi.fn>).mockResolvedValue({
      txHash: '0xTxHash',
      ipId: '0xIpId',
      tokenId: BigInt(42),
      explorerUrl: 'https://aeneid.explorer.story.foundation/ipa/0xIpId',
    });

    const res = await POST({} as unknown as NextRequest, makeParams());

    expect(res.status).toBe(200);
    const data = (await res.json()) as { success: boolean; ipId: string; tokenId: string };
    expect(data).toEqual({
      success: true,
      ipId: '0xIpId',
      txHash: '0xTxHash',
      tokenId: '42',
      explorerUrl: 'https://aeneid.explorer.story.foundation/ipa/0xIpId',
    });
    expect(mockDb.update).toHaveBeenCalled();
    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({ ipId: '0xIpId', ipTxHash: '0xTxHash', ipTokenId: '42' }),
    );
  });

  it('链上注册失败时返回 500，不更新数据库', async () => {
    mockDb.limit.mockResolvedValueOnce([gameRow]).mockResolvedValueOnce([]);
    (createStoryClient as ReturnType<typeof vi.fn>).mockReturnValue({ storyClient: {} });
    (uploadMetadataToIpfs as ReturnType<typeof vi.fn>).mockResolvedValue('ipfs://Qm123');
    (registerGameAsIp as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('链上交易失败'));

    const res = await POST({} as unknown as NextRequest, makeParams());

    expect(res.status).toBe(500);
    const data = (await res.json()) as { error: string };
    expect(data.error).toBe('链上交易失败');
    expect(mockDb.update).not.toHaveBeenCalled();
  });
});

describe('GET /api/cms/games/[id]/register-ip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'u1' } });
    mockDb.limit.mockReset();
  });

  it('未登录返回 401', async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await GET({} as unknown as NextRequest, makeParams());

    expect(res.status).toBe(401);
  });

  it('未注册时返回 registered: false', async () => {
    mockDb.limit.mockResolvedValueOnce([{ ...gameRow, ipId: null }]);

    const res = await GET({} as unknown as NextRequest, makeParams());

    expect(res.status).toBe(200);
    const data = (await res.json()) as { registered: boolean };
    expect(data).toEqual({ registered: false });
  });

  it('已注册时返回完整信息', async () => {
    mockDb.limit.mockResolvedValueOnce([
      {
        ...gameRow,
        ipId: '0xIpId',
        ipTxHash: '0xTxHash',
        ipTokenId: '42',
        ipRegisteredAt: new Date('2026-07-01T00:00:00.000Z'),
      },
    ]);

    const res = await GET({} as unknown as NextRequest, makeParams());

    const data = (await res.json()) as { registered: boolean; ipId: string; explorerUrl: string };
    expect(data.registered).toBe(true);
    expect(data.ipId).toBe('0xIpId');
    expect(data.explorerUrl).toBe('https://aeneid.explorer.story.foundation/ipa/0xIpId');
  });
});
