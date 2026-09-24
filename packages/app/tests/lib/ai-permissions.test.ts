import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn(() => ({ env: { DB: {} } })),
}));

const { limitMock } = vi.hoisted(() => ({ limitMock: vi.fn() }));

vi.mock('drizzle-orm/d1', () => ({
  drizzle: vi.fn(() => ({
    select: () => ({
      from: () => ({
        where: () => ({ limit: limitMock }),
      }),
    }),
  })),
}));

vi.mock('@/lib/admin', () => ({
  isRootUser: vi.fn(),
  isAdminUser: vi.fn((user: { isAdmin?: boolean } | null | undefined) => user?.isAdmin === true),
  isAdminUserId: vi.fn(),
}));

const { getUsableSubscriptionMock } = vi.hoisted(() => ({ getUsableSubscriptionMock: vi.fn() }));

vi.mock('@/lib/billing', () => ({
  getUsableSubscription: getUsableSubscriptionMock,
}));

import { isRootUser } from '@/lib/admin';
import {
  ALL_TEXT_PROVIDERS,
  checkAiServicePermission,
  getUserAiPermissions,
  parseAiPermissions,
  PLAN_AI_PERMISSIONS,
  resolveTextProvider,
} from '@/lib/ai-permissions';
import { getUsableSubscription } from '@/lib/billing';

describe('parseAiPermissions', () => {
  it('null/undefined/坏 JSON 表示未显式配置（跟随套餐）', () => {
    expect(parseAiPermissions(null)).toBeNull();
    expect(parseAiPermissions(undefined)).toBeNull();
    expect(parseAiPermissions('{not json')).toBeNull();
  });

  it('过滤未知 provider', () => {
    const parsed = parseAiPermissions(
      JSON.stringify({ providers: ['anthropic', 'gpt-x', 'mimo'], canGenerateImage: true }),
    );
    expect(parsed?.providers).toEqual(['anthropic', 'mimo']);
    expect(parsed?.canGenerateImage).toBe(true);
  });

  it('旧数据缺少的新字段按 false 处理，不意外提权', () => {
    const parsed = parseAiPermissions(JSON.stringify({ providers: ['opencode'], canGenerateImage: true }));
    expect(parsed?.canGenerateImage).toBe(true);
    expect(parsed?.canGenerateTts).toBe(false);
    expect(parsed?.canGenerateMusic).toBe(false);
    expect(parsed?.canGenerateVideo).toBe(false);
  });

  it('非布尔 flag 视为 false', () => {
    const parsed = parseAiPermissions(JSON.stringify({ providers: ['opencode'], canGenerateImage: 'yes' }));
    expect(parsed?.canGenerateImage).toBe(false);
  });
});

describe('getUserAiPermissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUsableSubscriptionMock.mockResolvedValue(null);
  });

  it('root 用户拥有全部权限，不查库', async () => {
    (isRootUser as ReturnType<typeof vi.fn>).mockReturnValue(true);

    const permissions = await getUserAiPermissions({ id: 'u1', email: 'root@example.com' });
    expect(permissions.providers).toEqual(ALL_TEXT_PROVIDERS);
    expect(permissions.canGenerateImage).toBe(true);
    expect(permissions.canGenerateVideo).toBe(true);
    expect(limitMock).not.toHaveBeenCalled();
  });

  it('内容管理员（is_admin）同样全开', async () => {
    (isRootUser as ReturnType<typeof vi.fn>).mockReturnValue(false);
    limitMock.mockResolvedValue([{ aiPermissions: null, isAdmin: true }]);

    const permissions = await getUserAiPermissions({ id: 'u2', email: 'admin@example.com' });
    expect(permissions).toEqual(PLAN_AI_PERMISSIONS.pro);
  });

  it('显式配置优先于套餐默认', async () => {
    (isRootUser as ReturnType<typeof vi.fn>).mockReturnValue(false);
    limitMock.mockResolvedValue([
      { aiPermissions: JSON.stringify({ providers: ['anthropic'], canGenerateImage: true }), isAdmin: false },
    ]);

    const permissions = await getUserAiPermissions({ id: 'u3', email: 'user@example.com' });
    expect(permissions.providers).toEqual(['anthropic']);
    expect(permissions.canGenerateImage).toBe(true);
    expect(permissions.canGenerateVideo).toBe(false);
  });

  it('未配置时跟随订阅套餐：免费只有文本，Pro 加生图/声音/音乐，Pro+ 再加视频', async () => {
    (isRootUser as ReturnType<typeof vi.fn>).mockReturnValue(false);
    limitMock.mockResolvedValue([{ aiPermissions: null, isAdmin: false }]);

    getUsableSubscriptionMock.mockResolvedValue(null);
    const free = await getUserAiPermissions({ id: 'u4', email: 'user@example.com' });
    expect(free).toEqual(PLAN_AI_PERMISSIONS.free);
    expect(free.canGenerateImage).toBe(false);
    expect(free.canGenerateVideo).toBe(false);

    getUsableSubscriptionMock.mockResolvedValue({ planCode: 'basic' });
    const basic = await getUserAiPermissions({ id: 'u4', email: 'user@example.com' });
    expect(basic.canGenerateImage).toBe(true);
    expect(basic.canGenerateTts).toBe(true);
    expect(basic.canGenerateMusic).toBe(true);
    expect(basic.canGenerateVideo).toBe(false);

    getUsableSubscriptionMock.mockResolvedValue({ planCode: 'pro' });
    const pro = await getUserAiPermissions({ id: 'u4', email: 'user@example.com' });
    expect(pro.canGenerateVideo).toBe(true);
  });

  it('显式配置里的 provider 全非法时，provider 回退套餐默认', async () => {
    (isRootUser as ReturnType<typeof vi.fn>).mockReturnValue(false);
    limitMock.mockResolvedValue([
      { aiPermissions: JSON.stringify({ providers: ['nope'], canGenerateImage: true }), isAdmin: false },
    ]);

    const permissions = await getUserAiPermissions({ id: 'u5', email: 'user@example.com' });
    expect(permissions.providers).toEqual(ALL_TEXT_PROVIDERS);
    expect(permissions.canGenerateImage).toBe(true);
  });
});

describe('resolveTextProvider', () => {
  const permissions = {
    providers: ['mimo', 'anthropic'] as ('mimo' | 'anthropic')[],
    canGenerateImage: false,
    canGenerateTts: false,
    canGenerateMusic: false,
    canGenerateVideo: false,
  };

  it('请求的 provider 在许可列表内则使用', () => {
    expect(resolveTextProvider({ ...permissions, providers: [...permissions.providers] }, 'anthropic')).toBe(
      'anthropic',
    );
  });

  it('请求的 provider 不在许可列表内则回退第一项', () => {
    expect(resolveTextProvider({ ...permissions, providers: [...permissions.providers] }, 'openai')).toBe('mimo');
    expect(resolveTextProvider({ ...permissions, providers: [...permissions.providers] }, 'bogus')).toBe('mimo');
  });

  it('未请求时使用第一项；空列表兜底 opencode', () => {
    expect(resolveTextProvider({ ...permissions, providers: [...permissions.providers] })).toBe('mimo');
    expect(resolveTextProvider({ ...permissions, providers: [] })).toBe('opencode');
  });
});

describe('checkAiServicePermission', () => {
  const base = {
    providers: ['mimo'] as ('mimo' | 'anthropic')[],
    canGenerateImage: false,
    canGenerateTts: false,
    canGenerateMusic: false,
    canGenerateVideo: false,
  };

  it('对应 flag 为 true 时放行', () => {
    expect(checkAiServicePermission(base, 'video').allowed).toBe(false);
    expect(checkAiServicePermission({ ...base, canGenerateVideo: true }, 'video').allowed).toBe(true);
    expect(checkAiServicePermission({ ...base, canGenerateTts: true }, 'tts').allowed).toBe(true);
    expect(checkAiServicePermission({ ...base, canGenerateMusic: true }, 'music').allowed).toBe(true);
  });

  it('无权限时给出带服务名的提示', () => {
    const result = checkAiServicePermission(base, 'image');
    expect(result.allowed).toBe(false);
    expect(result.message).toContain('图片生成');
  });
});
