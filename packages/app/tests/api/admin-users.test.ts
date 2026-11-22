import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock getCloudflareContext
vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn(),
}));

// Mock drizzle
vi.mock('drizzle-orm/d1', () => ({
  drizzle: vi.fn(),
}));

// Mock auth-server
vi.mock('@/lib/auth-server', () => ({
  getSession: vi.fn(),
}));

// Mock config
vi.mock('@/lib/admin', () => ({
  isRootUser: vi.fn(),
  isAdminUser: vi.fn(),
  isAdminUserId: vi.fn(),
}));

// Mock auth-config
vi.mock('@/lib/auth-config', () => ({
  createAuth: vi.fn(),
}));

// Mock 公开目录缓存失效（内部依赖 next/cache 与 CF 上下文）
vi.mock('@/lib/public-cache', () => ({
  revalidatePublicCatalog: vi.fn(),
}));

import { GET, POST } from '@/app/api/admin/users/route';
import { GET as GET_USER, PUT as PUT_USER, DELETE as DELETE_USER } from '@/app/api/admin/users/[id]/route';
import { PATCH as PATCH_BAN } from '@/app/api/admin/users/[id]/ban/route';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import { getSession } from '@/lib/auth-server';
import { isRootUser, isAdminUser } from '@/lib/admin';
import { createAuth } from '@/lib/auth-config';

describe('Admin Users API', () => {
  const mockEnv = {
    DB: {},
    NEXT_PUBLIC_ROOT_USER_EMAIL: 'admin@test.com',
  };

  const mockSession = {
    user: { id: 'admin-1', email: 'admin@test.com' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (getCloudflareContext as ReturnType<typeof vi.fn>).mockReturnValue({ env: mockEnv });
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession);
    (isRootUser as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (isAdminUser as ReturnType<typeof vi.fn>).mockReturnValue(true);
  });

  describe('GET /api/admin/users', () => {
    it('应该拒绝非管理员的请求', async () => {
      (isAdminUser as ReturnType<typeof vi.fn>).mockReturnValue(false);

      const req = new Request('http://localhost/api/admin/users');
      const res = await GET(req);

      expect(res.status).toBe(403);
    });

    it('应该拒绝未登录的请求', async () => {
      (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const req = new Request('http://localhost/api/admin/users');
      const res = await GET(req);

      expect(res.status).toBe(403);
    });

    it('应该返回用户列表', async () => {
      const mockUsers = [
        {
          id: 'u1',
          name: 'User 1',
          email: 'u1@test.com',
          emailVerified: true,
          createdAt: Date.now(),
          gameCount: 3,
          totalTokens: 123456,
          imageCount: 7,
          videoCount: 2,
          audioCount: 11,
        },
      ];
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue(mockUsers),
        get: vi.fn().mockResolvedValue({ count: 1 }),
      };
      (drizzle as ReturnType<typeof vi.fn>).mockReturnValue(mockDb);

      const req = new Request('http://localhost/api/admin/users?page=1&limit=20');
      const res = await GET(req);

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.users).toEqual(mockUsers);
      expect(data.users[0].totalTokens).toBe(123456);
      expect(data.pagination.total).toBe(1);
    });
  });

  describe('POST /api/admin/users', () => {
    it('应该拒绝非管理员的请求', async () => {
      (isRootUser as ReturnType<typeof vi.fn>).mockReturnValue(false);

      const req = new Request('http://localhost/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New', email: 'new@test.com', password: '123456' }),
      });
      const res = await POST(req);

      expect(res.status).toBe(403);
    });

    it('应该拒绝缺少必填字段的请求', async () => {
      const req = new Request('http://localhost/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New' }),
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it('应该拒绝过短的密码', async () => {
      const req = new Request('http://localhost/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New', email: 'new@test.com', password: '123' }),
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
      const data = (await res.json()) as any;
      expect(data.error).toContain('6');
    });

    it('应该成功创建用户', async () => {
      const mockAuthResult = { user: { id: 'new-1', name: 'New', email: 'new@test.com' } };
      (createAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        api: {
          signUpEmail: vi.fn().mockResolvedValue(mockAuthResult),
        },
      });

      const req = new Request('http://localhost/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New', email: 'new@test.com', password: '123456' }),
      });
      const res = await POST(req);

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.success).toBe(true);
      expect(data.user.email).toBe('new@test.com');
    });
  });

  describe('PUT /api/admin/users/[id]', () => {
    it('应该拒绝非管理员的请求', async () => {
      (isRootUser as ReturnType<typeof vi.fn>).mockReturnValue(false);

      const req = new Request('http://localhost/api/admin/users/u1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated' }),
      });
      const res = await PUT_USER(req, { params: Promise.resolve({ id: 'u1' }) });

      expect(res.status).toBe(403);
    });

    it('应该拒绝空的更新内容', async () => {
      const req = new Request('http://localhost/api/admin/users/u1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const res = await PUT_USER(req, { params: Promise.resolve({ id: 'u1' }) });

      expect(res.status).toBe(400);
    });

    it('应该成功更新用户', async () => {
      const mockDb = {
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      };
      (drizzle as ReturnType<typeof vi.fn>).mockReturnValue(mockDb);

      const req = new Request('http://localhost/api/admin/users/u1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated Name' }),
      });
      const res = await PUT_USER(req, { params: Promise.resolve({ id: 'u1' }) });

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.success).toBe(true);
    });
  });

  describe('DELETE /api/admin/users/[id]', () => {
    it('应该拒绝非管理员的请求', async () => {
      (isRootUser as ReturnType<typeof vi.fn>).mockReturnValue(false);

      const req = new Request('http://localhost/api/admin/users/u1', { method: 'DELETE' });
      const res = await DELETE_USER(req, { params: Promise.resolve({ id: 'u1' }) });

      expect(res.status).toBe(403);
    });

    it('应该阻止删除自己', async () => {
      const req = new Request('http://localhost/api/admin/users/admin-1', { method: 'DELETE' });
      const res = await DELETE_USER(req, { params: Promise.resolve({ id: 'admin-1' }) });

      expect(res.status).toBe(400);
      const data = (await res.json()) as any;
      expect(data.error).toContain('自己');
    });

    it('应该阻止删除有游戏的用户', async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue({ count: 5 }),
      };
      (drizzle as ReturnType<typeof vi.fn>).mockReturnValue(mockDb);

      const req = new Request('http://localhost/api/admin/users/u1', { method: 'DELETE' });
      const res = await DELETE_USER(req, { params: Promise.resolve({ id: 'u1' }) });

      expect(res.status).toBe(400);
      const data = (await res.json()) as any;
      expect(data.error).toContain('5');
    });

    it('应该成功删除无游戏的用户', async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue({ count: 0 }),
        delete: vi.fn().mockReturnThis(),
      };
      (drizzle as ReturnType<typeof vi.fn>).mockReturnValue(mockDb);

      const req = new Request('http://localhost/api/admin/users/u1', { method: 'DELETE' });
      const res = await DELETE_USER(req, { params: Promise.resolve({ id: 'u1' }) });

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.success).toBe(true);
    });
  });

  describe('PATCH /api/admin/users/[id]/ban', () => {
    it('应该拒绝非管理员的请求', async () => {
      (isAdminUser as ReturnType<typeof vi.fn>).mockReturnValue(false);

      const req = new Request('http://localhost/api/admin/users/u1/ban', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ banned: true }),
      });
      const res = await PATCH_BAN(req, { params: Promise.resolve({ id: 'u1' }) });

      expect(res.status).toBe(403);
    });

    it('应该拒绝缺少 banned 字段的请求', async () => {
      const req = new Request('http://localhost/api/admin/users/u1/ban', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ banReason: 'NSFW' }),
      });
      const res = await PATCH_BAN(req, { params: Promise.resolve({ id: 'u1' }) });

      expect(res.status).toBe(400);
    });

    it('应该拒绝封禁自己', async () => {
      const req = new Request('http://localhost/api/admin/users/admin-1/ban', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ banned: true }),
      });
      const res = await PATCH_BAN(req, { params: Promise.resolve({ id: 'admin-1' }) });

      expect(res.status).toBe(400);
      const data = (await res.json()) as any;
      expect(data.error).toContain('自己');
    });

    it('应该拒绝封禁 root 账号', async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue({ email: 'admin@test.com' }),
      };
      (drizzle as ReturnType<typeof vi.fn>).mockReturnValue(mockDb);

      const req = new Request('http://localhost/api/admin/users/u1/ban', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ banned: true }),
      });
      const res = await PATCH_BAN(req, { params: Promise.resolve({ id: 'u1' }) });

      expect(res.status).toBe(400);
      const data = (await res.json()) as any;
      expect(data.error).toContain('root');
    });

    it('封禁应级联清除 session', async () => {
      (isRootUser as ReturnType<typeof vi.fn>).mockReturnValue(false);
      const sessionDelete = vi.fn().mockResolvedValue(undefined);
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue({ email: 'u1@test.com' }),
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        delete: vi.fn(() => ({ where: sessionDelete })),
      };
      (drizzle as ReturnType<typeof vi.fn>).mockReturnValue(mockDb);

      const req = new Request('http://localhost/api/admin/users/u1/ban', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ banned: true, banReason: 'NSFW', shadowBanGames: false }),
      });
      const res = await PATCH_BAN(req, { params: Promise.resolve({ id: 'u1' }) });

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.success).toBe(true);
      expect(data.banned).toBe(true);
      expect(mockDb.delete).toHaveBeenCalled();
    });

    it('应该在用户不存在时返回 404', async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(undefined),
      };
      (drizzle as ReturnType<typeof vi.fn>).mockReturnValue(mockDb);

      const req = new Request('http://localhost/api/admin/users/ghost/ban', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ banned: true }),
      });
      const res = await PATCH_BAN(req, { params: Promise.resolve({ id: 'ghost' }) });

      expect(res.status).toBe(404);
    });
  });
});
