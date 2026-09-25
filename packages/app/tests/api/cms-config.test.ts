import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth-server', () => ({
  getSession: vi.fn(),
}));

vi.mock('@/lib/config', () => ({
  getConfig: vi.fn(),
}));

vi.mock('@/lib/ai-permissions', () => ({
  getUserAiPermissions: vi.fn(),
}));

vi.mock('@/lib/user-ai-settings', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/user-ai-settings')>();
  return {
    ...actual,
    getUserAiPreferences: vi.fn(),
    isPaidAiUser: vi.fn(),
  };
});

import { GET } from '@/app/api/cms/config/route';
import { getUserAiPermissions } from '@/lib/ai-permissions';
import { getSession } from '@/lib/auth-server';
import { getConfig } from '@/lib/config';
import { getUserAiPreferences, isPaidAiUser } from '@/lib/user-ai-settings';

describe('GET /api/cms/config', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('未登录返回 401', async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await GET();

    expect(res.status).toBe(401);
  });

  it('只返回用户需要的字段，不泄漏完整管理配置', async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'u1' } });
    (getConfig as ReturnType<typeof vi.fn>).mockResolvedValue({
      defaultTextProvider: 'opencode',
      defaultAiProvider: 'opencode',
      defaultTtsProvider: 'google',
      defaultImageProvider: 'google',
      defaultVideoProvider: 'google',
      defaultSttProvider: 'openai',
      dailyTokenLimit: 100000,
      adminUserIds: ['secret-admin-id'],
    });
    (getUserAiPermissions as ReturnType<typeof vi.fn>).mockResolvedValue({ providers: ['opencode'] });
    (getUserAiPreferences as ReturnType<typeof vi.fn>).mockResolvedValue({
      text: null,
      image: null,
      tts: null,
      video: null,
    });
    (isPaidAiUser as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    const res = await GET();

    expect(res.status).toBe(200);
    const data = (await res.json()) as Record<string, unknown>;
    expect(data).toEqual({
      defaultTextProvider: 'opencode',
      defaultAiProvider: 'opencode',
      defaultTtsProvider: 'google',
      defaultImageProvider: 'google',
      defaultVideoProvider: 'google',
      defaultSttProvider: 'openai',
      aiPermissions: { providers: ['opencode'] },
      userDefaultAiProvider: null,
      userDefaultAiModel: null,
      userDefaultImage: null,
      userDefaultTts: null,
      userDefaultVideo: null,
    });
    expect(data.adminUserIds).toBeUndefined();
    expect(data.dailyTokenLimit).toBeUndefined();
  });

  it('付费用户自选模型随配置下发', async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'u1' } });
    (getConfig as ReturnType<typeof vi.fn>).mockResolvedValue({
      defaultTextProvider: 'opencode',
      defaultAiProvider: 'opencode',
      defaultTtsProvider: 'google',
      defaultImageProvider: 'google',
      defaultVideoProvider: 'google',
      defaultSttProvider: 'openai',
    });
    (getUserAiPermissions as ReturnType<typeof vi.fn>).mockResolvedValue({
      providers: ['opencode', 'openai'],
      canGenerateImage: true,
      canGenerateTts: false,
      canGenerateMusic: false,
      canGenerateVideo: false,
    });
    (getUserAiPreferences as ReturnType<typeof vi.fn>).mockResolvedValue({
      text: { provider: 'openai', model: 'gpt-5-mini' },
      image: { provider: 'openai', model: 'gpt-image-1' },
      tts: null,
      video: null,
    });
    (isPaidAiUser as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    const res = await GET();

    const data = (await res.json()) as Record<string, unknown>;
    expect(data.userDefaultAiProvider).toBe('openai');
    expect(data.userDefaultAiModel).toBe('gpt-5-mini');
    expect(data.userDefaultImage).toEqual({ provider: 'openai', model: 'gpt-image-1' });
    expect(data.userDefaultTts).toBeNull();
    expect(data.userDefaultVideo).toBeNull();
  });

  it('自选供应商不在许可内时不下发', async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'u1' } });
    (getConfig as ReturnType<typeof vi.fn>).mockResolvedValue({
      defaultTextProvider: 'opencode',
      defaultAiProvider: 'opencode',
      defaultTtsProvider: 'google',
      defaultImageProvider: 'google',
      defaultVideoProvider: 'google',
      defaultSttProvider: 'openai',
    });
    (getUserAiPermissions as ReturnType<typeof vi.fn>).mockResolvedValue({ providers: ['opencode'] });
    (getUserAiPreferences as ReturnType<typeof vi.fn>).mockResolvedValue({
      text: { provider: 'openai', model: 'gpt-5-mini' },
      image: null,
      tts: null,
      video: null,
    });
    (isPaidAiUser as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    const res = await GET();

    const data = (await res.json()) as Record<string, unknown>;
    expect(data.userDefaultAiProvider).toBeNull();
    expect(data.userDefaultAiModel).toBeNull();
  });
});
