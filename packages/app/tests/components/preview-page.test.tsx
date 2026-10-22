import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  get: vi.fn(),
};

const mockD1 = {
  prepare: vi.fn().mockReturnThis(),
  bind: vi.fn().mockReturnThis(),
  first: vi.fn(),
};

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn(() => ({ env: { DB: mockD1 } })),
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
vi.mock('@/lib/games', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/games')>();
  return { ...actual, getGameBySlug: getGameBySlugMock.mockImplementation(actual.getGameBySlug) };
});

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
  redirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
}));

function TestPlayer({ game }: { game: { title: string } }) {
  return <div>{game.title}</div>;
}

vi.mock('@/components/game-player', () => ({ GamePlayerImmersive: TestPlayer }));
vi.mock('@/components/GamePlayer', () => ({ default: TestPlayer }));
vi.mock('next/link', () => ({ default: () => null }));

import PreviewPage from '@/app/preview/[slug]/page';
import { getSession } from '@/lib/auth-server';

function makeParams(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

function mockGame(overrides: { slug?: string; published?: boolean; shadowBanned?: boolean } = {}) {
  const game = { id: 2155, slug: 'g', ownerId: 'owner-1', published: false, shadowBanned: false, ...overrides };
  mockDb.get.mockResolvedValue(game);
  mockD1.first.mockReset();
  mockD1.first.mockResolvedValueOnce({
    id: game.id,
    owner_id: game.ownerId,
    published: Number(game.published),
    shadow_banned: Number(game.shadowBanned),
    updated_at: 1700000000,
    content: '---\ntitle: "预览测试作品"\n---\n# start\n\n测试正文',
    author_name: '作者甲',
    author_image: null,
  });
  mockD1.first.mockResolvedValue(null);
}

describe('预览路由 /preview/[slug]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGame();
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
    mockGame({ published: true, shadowBanned: true });

    await expect(PreviewPage(makeParams('g'))).rejects.toThrow('NEXT_NOT_FOUND');
    expect(getGameBySlugMock).not.toHaveBeenCalled();
  });

  it('作者可以预览自己被封禁的作品，且请求放行 shadowban', async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'owner-1', email: 'o@test.com' } });
    mockGame({ published: true, shadowBanned: true });

    await PreviewPage(makeParams('g'));

    expect(getGameBySlugMock).toHaveBeenCalledWith('g', { includeShadowBanned: true, includeUnpublished: true });
  });

  it('内容管理员可以预览他人被封禁的作品', async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: 'ca-1', email: 'ca@test.com', isAdmin: true },
    });
    mockGame({ published: true, shadowBanned: true });

    await PreviewPage(makeParams('g'));

    expect(getGameBySlugMock).toHaveBeenCalledWith('g', { includeShadowBanned: true, includeUnpublished: true });
  });

  it('作者可以预览自己未发布的作品', async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'owner-1', email: 'o@test.com' } });
    mockGame({ slug: '-2155' });

    render(await PreviewPage(makeParams('-2155')));

    expect(screen.getByText('预览测试作品')).toBeInTheDocument();
    expect(screen.getByText(/此作品尚未发布/)).toBeInTheDocument();
  });

  it.each([
    { id: 'ca-1', email: 'ca@test.com', isAdmin: true },
    { id: 'owner-1', email: 'o@test.com', isAdmin: false },
  ])('作者和管理员都可以预览未发布且被封禁的作品：$id', async (user) => {
    vi.mocked(getSession).mockResolvedValue({ user } as Awaited<ReturnType<typeof getSession>>);
    mockGame({ shadowBanned: true });

    render(await PreviewPage(makeParams('g')));

    expect(screen.getByText('预览测试作品')).toBeInTheDocument();
    expect(screen.getByText(/此作品已被封禁/)).toBeInTheDocument();
  });

  it('普通用户无法预览他人未发布作品，也不会读取正文', async () => {
    vi.mocked(getSession).mockResolvedValue({
      user: { id: 'other-user', email: 'other@test.com' },
    } as Awaited<ReturnType<typeof getSession>>);

    await expect(PreviewPage(makeParams('-2155'))).rejects.toThrow('NEXT_NOT_FOUND');
    expect(getGameBySlugMock).not.toHaveBeenCalled();
    expect(mockD1.prepare).not.toHaveBeenCalled();
  });
});
