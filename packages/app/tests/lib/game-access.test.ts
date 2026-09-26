import { beforeEach, describe, expect, it, vi } from 'vitest';

const { isRootUserMock } = vi.hoisted(() => ({ isRootUserMock: vi.fn() }));
vi.mock('@/lib/admin', () => ({
  isRootUser: isRootUserMock,
  // canManageGame 依赖它：root 或 is_admin 标记
  // 注意不能在这里 import 真实实现，必须复用同一个 isRootUser mock，否则测试控制不到
  isAdminUser: vi.fn((user: { email?: string; isAdmin?: boolean } | null | undefined) =>
    Boolean(user && (user.isAdmin === true || (user.email && isRootUserMock(user.email)))),
  ),
  isAdminUserId: vi.fn(),
}));

import { canManageGame, getManagedGame } from '@/lib/game-access';

const ownerSession = { user: { id: 'owner-1', email: 'owner@example.com' } };
const otherSession = { user: { id: 'other-1', email: 'other@example.com' } };
const rootSession = { user: { id: 'root-1', email: 'root@example.com' } };
const contentAdminSession = { user: { id: 'ca-1', email: 'ca@example.com', isAdmin: true } };

describe('canManageGame', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isRootUserMock.mockImplementation((email: string) => email === 'root@example.com');
  });

  it('所有者可管理', () => {
    expect(canManageGame(ownerSession, { ownerId: 'owner-1' })).toBe(true);
  });

  it('root 用户可管理任意游戏', () => {
    expect(canManageGame(rootSession, { ownerId: 'owner-1' })).toBe(true);
  });

  it('内容管理员可管理任意游戏', () => {
    expect(canManageGame(contentAdminSession, { ownerId: 'owner-1' })).toBe(true);
  });

  it('其他用户不可管理', () => {
    expect(canManageGame(otherSession, { ownerId: 'owner-1' })).toBe(false);
  });
});

describe('getManagedGame', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isRootUserMock.mockImplementation((email: string) => email === 'root@example.com');
  });

  function mockDb(game: unknown) {
    return {
      select: () => ({
        from: () => ({
          where: () => ({ get: vi.fn().mockResolvedValue(game) }),
        }),
      }),
    } as never;
  }

  it('游戏不存在返回 null', async () => {
    expect(await getManagedGame(mockDb(undefined), 1, ownerSession)).toBeNull();
  });

  it('无权限返回 null，所有者/root 返回游戏', async () => {
    const game = { id: 1, ownerId: 'owner-1' };
    expect(await getManagedGame(mockDb(game), 1, otherSession)).toBeNull();
    expect(await getManagedGame(mockDb(game), 1, ownerSession)).toEqual(game);
    expect(await getManagedGame(mockDb(game), 1, rootSession)).toEqual(game);
  });
});
