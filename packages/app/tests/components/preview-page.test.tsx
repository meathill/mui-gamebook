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

vi.mock('@/lib/admin', () => ({
  isRootUser: vi.fn(),
  isAdminUser: vi.fn((user: { isAdmin?: boolean } | null | undefined) => user?.isAdmin === true),
  isAdminUserId: vi.fn(),
}));

const { getGameBySlugMock } = vi.hoisted(() => ({ getGameBySlugMock: vi.fn() }));
vi.mock('@/lib/games', () => ({
  getGameBySlug: getGameBySlugMock,
}));

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
  redirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
}));

vi.mock('@/components/game-player', () => ({ GamePlayerImmersive: () => null }));
vi.mock('@/components/GamePlayer', () => ({ default: () => null }));
vi.mock('next/link', () => ({ default: () => null }));

import PreviewPage from '@/app/preview/[slug]/page';
import { getSession } from '@/lib/auth-server';

const fakeGame = {
  title: '被ban的作品',
  scenes: {},
  display_mode: 'classic',
  tags: [],
};

function makeParams(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

describe('预览路由 /preview/[slug]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getGameBySlugMock.mockResolvedValue(fakeGame);
  });

  it('未登录跳转登录页', async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(PreviewPage(makeParams('g'))).rejects.toThrow('NEXT_REDIRECT');
  });

  it('游戏不存在时 404', async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'u1', email: 'u1@test.com' } });
    mockDb.get.mockResolvedValue(undefined);

    await expect(PreviewPage(makeParams('g'))).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('非作者且非管理员访问他人作品时 404', async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'u2', email: 'u2@test.com' } });
    mockDb.get.mockResolvedValue({ slug: 'g', ownerId: 'owner-1', published: true, shadowBanned: true });

    await expect(PreviewPage(makeParams('g'))).rejects.toThrow('NEXT_NOT_FOUND');
    expect(getGameBySlugMock).not.toHaveBeenCalled();
  });

  it('作者可以预览自己被封禁的作品，且请求放行 shadowban', async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'owner-1', email: 'o@test.com' } });
    mockDb.get.mockResolvedValue({ slug: 'g', ownerId: 'owner-1', published: true, shadowBanned: true });

    await PreviewPage(makeParams('g'));

    expect(getGameBySlugMock).toHaveBeenCalledWith('g', { includeShadowBanned: true });
  });

  it('内容管理员可以预览他人被封禁的作品', async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: 'ca-1', email: 'ca@test.com', isAdmin: true },
    });
    mockDb.get.mockResolvedValue({ slug: 'g', ownerId: 'owner-1', published: true, shadowBanned: true });

    await PreviewPage(makeParams('g'));

    expect(getGameBySlugMock).toHaveBeenCalledWith('g', { includeShadowBanned: true });
  });

  it('作者可以预览自己未发布的作品', async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'owner-1', email: 'o@test.com' } });
    mockDb.get.mockResolvedValue({ slug: 'g', ownerId: 'owner-1', published: false, shadowBanned: false });

    await PreviewPage(makeParams('g'));

    expect(getGameBySlugMock).toHaveBeenCalledWith('g', { includeShadowBanned: true });
  });
});
