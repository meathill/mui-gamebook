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

vi.mock('@/lib/config', () => ({
  getConfig: vi.fn(),
  isRootUser: vi.fn(),
}));

import {
  ALL_TEXT_PROVIDERS,
  checkVideoPermission,
  DEFAULT_AI_PERMISSIONS,
  getUserAiPermissions,
  parseAiPermissions,
  resolveTextProvider,
} from '@/lib/ai-permissions';
import { getConfig, isRootUser } from '@/lib/config';

describe('parseAiPermissions', () => {
  it('null/undefined 回退默认权限', () => {
    expect(parseAiPermissions(null)).toEqual(DEFAULT_AI_PERMISSIONS);
    expect(parseAiPermissions(undefined)).toEqual(DEFAULT_AI_PERMISSIONS);
  });

  it('坏 JSON 回退默认权限', () => {
    expect(parseAiPermissions('{not json')).toEqual(DEFAULT_AI_PERMISSIONS);
  });

  it('过滤未知 provider，空列表回退默认 providers', () => {
    const parsed = parseAiPermissions(
      JSON.stringify({ providers: ['anthropic', 'gpt-x', 'mimo'], canGenerateImage: true }),
    );
    expect(parsed.providers).toEqual(['anthropic', 'mimo']);
    expect(parsed.canGenerateImage).toBe(true);
    expect(parsed.canGenerateVideo).toBe(false);

    const empty = parseAiPermissions(JSON.stringify({ providers: ['unknown'] }));
    expect(empty.providers).toEqual(['mimo']);
  });

  it('非布尔 flag 视为 false', () => {
    const parsed = parseAiPermissions(JSON.stringify({ providers: ['mimo'], canGenerateImage: 'yes' }));
    expect(parsed.canGenerateImage).toBe(false);
  });
});

describe('getUserAiPermissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('root 用户拥有全部权限', async () => {
    (isRootUser as ReturnType<typeof vi.fn>).mockReturnValue(true);

    const permissions = await getUserAiPermissions({ id: 'u1', email: 'root@example.com' });
    expect(permissions.providers).toEqual(ALL_TEXT_PROVIDERS);
    expect(permissions.canGenerateImage).toBe(true);
    expect(permissions.canGenerateVideo).toBe(true);
    expect(limitMock).not.toHaveBeenCalled();
  });

  it('普通用户从 D1 读取并解析', async () => {
    (isRootUser as ReturnType<typeof vi.fn>).mockReturnValue(false);
    limitMock.mockResolvedValue([
      { aiPermissions: JSON.stringify({ providers: ['anthropic'], canGenerateImage: true }) },
    ]);

    const permissions = await getUserAiPermissions({ id: 'u2', email: 'user@example.com' });
    expect(permissions.providers).toEqual(['anthropic']);
    expect(permissions.canGenerateImage).toBe(true);
  });

  it('无记录时回退默认权限', async () => {
    (isRootUser as ReturnType<typeof vi.fn>).mockReturnValue(false);
    limitMock.mockResolvedValue([]);

    const permissions = await getUserAiPermissions({ id: 'u3', email: 'user@example.com' });
    expect(permissions).toEqual(DEFAULT_AI_PERMISSIONS);
  });
});

describe('resolveTextProvider', () => {
  const permissions = { providers: ['mimo', 'anthropic'] as const, canGenerateImage: false, canGenerateVideo: false };

  it('请求的 provider 在许可列表内则使用', () => {
    expect(resolveTextProvider({ ...permissions, providers: [...permissions.providers] }, 'anthropic')).toBe(
      'anthropic',
    );
  });

  it('请求的 provider 不在许可列表内则回退第一项', () => {
    expect(resolveTextProvider({ ...permissions, providers: [...permissions.providers] }, 'openai')).toBe('mimo');
    expect(resolveTextProvider({ ...permissions, providers: [...permissions.providers] }, 'bogus')).toBe('mimo');
  });

  it('未请求时使用第一项；空列表兜底 mimo', () => {
    expect(resolveTextProvider({ ...permissions, providers: [...permissions.providers] })).toBe('mimo');
    expect(resolveTextProvider({ providers: [], canGenerateImage: false, canGenerateVideo: false })).toBe('mimo');
  });
});

describe('checkVideoPermission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('canGenerateVideo 为 true 直接放行', async () => {
    const result = await checkVideoPermission(
      { email: 'a@b.com' },
      { providers: ['mimo'], canGenerateImage: false, canGenerateVideo: true },
    );
    expect(result.allowed).toBe(true);
    expect(getConfig).not.toHaveBeenCalled();
  });

  it('旧 videoWhitelist 命中作为过渡期 fallback', async () => {
    (getConfig as ReturnType<typeof vi.fn>).mockResolvedValue({ videoWhitelist: ['A@B.com'] });
    const result = await checkVideoPermission(
      { email: 'a@b.com' },
      { providers: ['mimo'], canGenerateImage: false, canGenerateVideo: false },
    );
    expect(result.allowed).toBe(true);
  });

  it('两者都没有则拒绝', async () => {
    (getConfig as ReturnType<typeof vi.fn>).mockResolvedValue({ videoWhitelist: [] });
    const result = await checkVideoPermission(
      { email: 'a@b.com' },
      { providers: ['mimo'], canGenerateImage: false, canGenerateVideo: false },
    );
    expect(result.allowed).toBe(false);
    expect(result.message).toContain('没有权限');
  });
});
