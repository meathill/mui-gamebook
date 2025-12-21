import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock getCloudflareContext
vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn(),
}));

// Mock drizzle
vi.mock('drizzle-orm/d1', () => ({
  drizzle: vi.fn(),
}));

import { GET, PUT } from '@/app/api/admin/games/[slug]/route';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';

describe('Admin Games API', () => {
  const mockEnv = {
    ADMIN_PASSWORD: 'test-secret',
    DB: {},
  };

  const mockGame = {
    id: 1,
    slug: 'test-game',
    title: 'Test Game',
    published: true,
    ownerId: 'user-1',
  };

  const mockContent = {
    content: '# start\n\nHello World',
    gameId: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (getCloudflareContext as ReturnType<typeof vi.fn>).mockReturnValue({ env: mockEnv });
  });

  describe('GET /api/admin/games/[slug]', () => {
    it('应该拒绝未认证的请求', async () => {
      const req = new Request('http://localhost/api/admin/games/test-game');
      const res = await GET(req, { params: Promise.resolve({ slug: 'test-game' }) });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('应该拒绝错误的密钥', async () => {
      const req = new Request('http://localhost/api/admin/games/test-game', {
        headers: { Authorization: 'Bearer wrong-secret' },
      });
      const res = await GET(req, { params: Promise.resolve({ slug: 'test-game' }) });

      expect(res.status).toBe(401);
    });

    it('应该在找不到游戏时返回 404', async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(null),
      };
      (drizzle as ReturnType<typeof vi.fn>).mockReturnValue(mockDb);

      const req = new Request('http://localhost/api/admin/games/not-found', {
        headers: { Authorization: 'Bearer test-secret' },
      });
      const res = await GET(req, { params: Promise.resolve({ slug: 'not-found' }) });

      expect(res.status).toBe(404);
    });

    it('应该成功返回剧本内容', async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValueOnce(mockGame).mockResolvedValueOnce(mockContent),
      };
      (drizzle as ReturnType<typeof vi.fn>).mockReturnValue(mockDb);

      const req = new Request('http://localhost/api/admin/games/test-game', {
        headers: { Authorization: 'Bearer test-secret' },
      });
      const res = await GET(req, { params: Promise.resolve({ slug: 'test-game' }) });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.slug).toBe('test-game');
      expect(data.content).toBe('# start\n\nHello World');
    });
  });

  describe('PUT /api/admin/games/[slug]', () => {
    it('应该拒绝未认证的请求', async () => {
      const req = new Request('http://localhost/api/admin/games/test-game', {
        method: 'PUT',
        body: JSON.stringify({ content: '# start\n\nNew content' }),
      });
      const res = await PUT(req, { params: Promise.resolve({ slug: 'test-game' }) });

      expect(res.status).toBe(401);
    });

    it('应该拒绝空内容', async () => {
      const req = new Request('http://localhost/api/admin/games/test-game', {
        method: 'PUT',
        headers: { Authorization: 'Bearer test-secret' },
        body: JSON.stringify({}),
      });
      const res = await PUT(req, { params: Promise.resolve({ slug: 'test-game' }) });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Content is required');
    });

    it('应该拒绝无效的 DSL 内容', async () => {
      const req = new Request('http://localhost/api/admin/games/test-game', {
        method: 'PUT',
        headers: { Authorization: 'Bearer test-secret' },
        body: JSON.stringify({ content: 'invalid content without scene' }),
      });
      const res = await PUT(req, { params: Promise.resolve({ slug: 'test-game' }) });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Invalid content');
    });
  });
});
