import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock getCloudflareContext
vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn(),
}));

// Mock drizzle
vi.mock('drizzle-orm/d1', () => ({
  drizzle: vi.fn(),
}));

// Mock session/root 判定（双通道鉴权的 session 通道）
vi.mock('@/lib/auth-server', () => ({
  getSession: vi.fn(),
}));
vi.mock('@/lib/config', () => ({
  isRootUser: vi.fn(),
}));

import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import { DELETE, GET, PATCH, PUT } from '@/app/api/admin/games/[slug]/route';
import { getSession } from '@/lib/auth-server';
import { isRootUser } from '@/lib/config';

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
    // 默认无 session（Bearer 通道单独测试）
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (isRootUser as ReturnType<typeof vi.fn>).mockReturnValue(false);
  });

  describe('GET /api/admin/games/[slug]', () => {
    it('应该拒绝未认证的请求', async () => {
      const req = new Request('http://localhost/api/admin/games/test-game');
      const res = await GET(req, { params: Promise.resolve({ slug: 'test-game' }) });

      expect(res.status).toBe(401);
      const data = (await res.json()) as any;
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
      const data = (await res.json()) as any;
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
      const data = (await res.json()) as any;
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
      const data = (await res.json()) as any;
      expect(data.error).toContain('Invalid content');
    });
  });

  describe('session 通道（root 用户后台访问）', () => {
    it('root 用户 session 无需 Bearer 即可访问', async () => {
      (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: { id: 'root-1', email: 'root@example.com' },
      });
      (isRootUser as ReturnType<typeof vi.fn>).mockReturnValue(true);

      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValueOnce(mockGame).mockResolvedValueOnce(mockContent),
      };
      (drizzle as ReturnType<typeof vi.fn>).mockReturnValue(mockDb);

      const req = new Request('http://localhost/api/admin/games/test-game');
      const res = await GET(req, { params: Promise.resolve({ slug: 'test-game' }) });

      expect(res.status).toBe(200);
    });

    it('非 root 用户 session 被拒绝', async () => {
      (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: { id: 'user-1', email: 'user@example.com' },
      });
      (isRootUser as ReturnType<typeof vi.fn>).mockReturnValue(false);

      const req = new Request('http://localhost/api/admin/games/test-game');
      const res = await GET(req, { params: Promise.resolve({ slug: 'test-game' }) });

      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /api/admin/games/[slug]', () => {
    it('应该切换发布状态', async () => {
      const setMock = vi.fn().mockReturnThis();
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(mockGame),
        update: vi.fn().mockReturnValue({ set: setMock, where: vi.fn().mockResolvedValue(undefined) }),
      };
      // update().set().where() 链
      setMock.mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
      (drizzle as ReturnType<typeof vi.fn>).mockReturnValue(mockDb);

      const req = new Request('http://localhost/api/admin/games/test-game', {
        method: 'PATCH',
        headers: { Authorization: 'Bearer test-secret' },
        body: JSON.stringify({ published: false }),
      });
      const res = await PATCH(req, { params: Promise.resolve({ slug: 'test-game' }) });

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.published).toBe(false);
      expect(setMock).toHaveBeenCalledWith(expect.objectContaining({ published: false }));
    });

    it('published 非布尔值时返回 400', async () => {
      const req = new Request('http://localhost/api/admin/games/test-game', {
        method: 'PATCH',
        headers: { Authorization: 'Bearer test-secret' },
        body: JSON.stringify({ published: 'yes' }),
      });
      const res = await PATCH(req, { params: Promise.resolve({ slug: 'test-game' }) });

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/admin/games/[slug]', () => {
    it('应该删除游戏', async () => {
      const deleteWhere = vi.fn().mockResolvedValue(undefined);
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(mockGame),
        delete: vi.fn().mockReturnValue({ where: deleteWhere }),
      };
      (drizzle as ReturnType<typeof vi.fn>).mockReturnValue(mockDb);

      const req = new Request('http://localhost/api/admin/games/test-game', {
        method: 'DELETE',
        headers: { Authorization: 'Bearer test-secret' },
      });
      const res = await DELETE(req, { params: Promise.resolve({ slug: 'test-game' }) });

      expect(res.status).toBe(200);
      expect(deleteWhere).toHaveBeenCalled();
    });

    it('游戏不存在时返回 404', async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(null),
        delete: vi.fn(),
      };
      (drizzle as ReturnType<typeof vi.fn>).mockReturnValue(mockDb);

      const req = new Request('http://localhost/api/admin/games/not-found', {
        method: 'DELETE',
        headers: { Authorization: 'Bearer test-secret' },
      });
      const res = await DELETE(req, { params: Promise.resolve({ slug: 'not-found' }) });

      expect(res.status).toBe(404);
      expect(mockDb.delete).not.toHaveBeenCalled();
    });
  });
});
