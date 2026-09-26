import { describe, expect, it } from 'vitest';
import {
  getDefaultImageModelForProvider,
  getDefaultTextModelForProvider,
  getDefaultTtsModelForProvider,
  getDefaultVideoModelForProvider,
  resolveEffectiveMediaSelection,
  resolveEffectiveTextSelection,
} from '@/lib/user-ai-settings';

const SYSTEM_MODELS = {
  opencode: 'deepseek-v4.1-flash',
  mimo: 'mimo-v2.5-pro',
  anthropic: 'claude-sonnet-5',
  google: 'gemini-3.8-flash',
  openai: 'gpt-5.6-luna',
} as const;

function baseOptions(overrides: Partial<Parameters<typeof resolveEffectiveTextSelection>[0]> = {}) {
  return {
    permissionsProviders: ['opencode', 'mimo', 'google', 'openai', 'anthropic'] as (
      | 'opencode'
      | 'mimo'
      | 'google'
      | 'openai'
      | 'anthropic'
    )[],
    systemDefaultProvider: 'opencode' as const,
    getSystemModel: (provider: keyof typeof SYSTEM_MODELS) => SYSTEM_MODELS[provider],
    userPreference: null,
    isPaid: false,
    ...overrides,
  };
}

describe('resolveEffectiveTextSelection', () => {
  it('免费用户无偏好时用许可第一项 + 系统默认模型', () => {
    const result = resolveEffectiveTextSelection(baseOptions());
    expect(result).toEqual({ provider: 'opencode', model: 'deepseek-v4.1-flash', isCustom: false });
  });

  it('免费用户即使有偏好也不生效', () => {
    const result = resolveEffectiveTextSelection(
      baseOptions({
        userPreference: { provider: 'openai', model: 'gpt-5-mini' },
        isPaid: false,
      }),
    );
    expect(result.isCustom).toBe(false);
    expect(result.model).toBe('deepseek-v4.1-flash');
  });

  it('付费用户偏好命中时使用自选模型', () => {
    const result = resolveEffectiveTextSelection(
      baseOptions({
        userPreference: { provider: 'openai', model: 'gpt-5-mini' },
        isPaid: true,
      }),
    );
    expect(result).toEqual({ provider: 'openai', model: 'gpt-5-mini', isCustom: true });
  });

  it('请求指定的合法 provider 优先于偏好，但模型仍跟该 provider 的偏好走', () => {
    const result = resolveEffectiveTextSelection(
      baseOptions({
        userPreference: { provider: 'openai', model: 'gpt-5-mini' },
        isPaid: true,
        requestedProvider: 'google',
      }),
    );
    expect(result.provider).toBe('google');
    expect(result.model).toBe('gemini-3.8-flash');
    expect(result.isCustom).toBe(false);
  });

  it('请求附带的合法 model 在付费时采信', () => {
    const result = resolveEffectiveTextSelection(
      baseOptions({
        userPreference: { provider: 'openai', model: 'gpt-5-mini' },
        isPaid: true,
        requestedProvider: 'openai',
        requestedModel: 'gpt-4o',
      }),
    );
    expect(result).toEqual({ provider: 'openai', model: 'gpt-4o', isCustom: true });
  });

  it('请求指定的非法 provider 回退许可第一项', () => {
    const result = resolveEffectiveTextSelection(baseOptions({ requestedProvider: 'gpt-x' }));
    expect(result.provider).toBe('opencode');
  });

  it('偏好供应商被管理员禁用时不生效', () => {
    const result = resolveEffectiveTextSelection(
      baseOptions({
        permissionsProviders: ['opencode'],
        userPreference: { provider: 'openai', model: 'gpt-5-mini' },
        isPaid: true,
      }),
    );
    expect(result).toEqual({ provider: 'opencode', model: 'deepseek-v4.1-flash', isCustom: false });
  });
});

describe('getDefaultTextModelForProvider', () => {
  it('五个供应商都有映射', () => {
    const config = {
      opencodeTextModel: 'deepseek-v4.1-flash',
      mimoTextModel: 'mimo-v2.5-pro',
      anthropicTextModel: 'claude-sonnet-5',
      googleTextModel: 'gemini-3.8-flash',
      openaiTextModel: 'gpt-5.6-luna',
    } as Parameters<typeof getDefaultTextModelForProvider>[0];
    expect(getDefaultTextModelForProvider(config, 'openai')).toBe('gpt-5.6-luna');
    expect(getDefaultTextModelForProvider(config, 'opencode')).toBe('deepseek-v4.1-flash');
  });
});

describe('resolveEffectiveMediaSelection', () => {
  const imageBase = {
    allowedProviders: ['google', 'openai'] as const,
    systemDefaultProvider: 'google' as const,
    getSystemModel: (provider: 'google' | 'openai') =>
      provider === 'google' ? 'gemini-3.1-flash-lite-image' : 'gpt-image-2.5-sunburst',
    userPreference: null as { provider: 'google' | 'openai'; model: string } | null,
    isPaid: true,
    serviceAllowed: true,
  };

  it('付费且有服务权限时命中自选', () => {
    const result = resolveEffectiveMediaSelection({
      ...imageBase,
      userPreference: { provider: 'openai', model: 'gpt-image-1' },
    });
    expect(result).toEqual({ provider: 'openai', model: 'gpt-image-1', isCustom: true });
  });

  it('免费用户忽略偏好，用系统默认', () => {
    const result = resolveEffectiveMediaSelection({
      ...imageBase,
      isPaid: false,
      userPreference: { provider: 'openai', model: 'gpt-image-1' },
    });
    expect(result).toEqual({ provider: 'google', model: 'gemini-3.1-flash-lite-image', isCustom: false });
  });

  it('服务位关闭时忽略偏好（纵深兜底）', () => {
    const result = resolveEffectiveMediaSelection({
      ...imageBase,
      serviceAllowed: false,
      userPreference: { provider: 'openai', model: 'gpt-image-1' },
    });
    expect(result.isCustom).toBe(false);
    expect(result.provider).toBe('google');
  });

  it('偏好供应商不在能力名单内时回落默认', () => {
    const result = resolveEffectiveMediaSelection({
      ...imageBase,
      userPreference: { provider: 'mimo', model: 'x' } as unknown as { provider: 'google' | 'openai'; model: string },
    });
    expect(result.isCustom).toBe(false);
  });

  it('三模态系统默认映射齐全', () => {
    const config = {
      googleImageModel: 'gemini-3.1-flash-lite-image',
      openaiImageModel: 'gpt-image-2.5-sunburst',
      mimoTtsModel: 'mimo-v2.5-tts',
      googleTtsModel: 'gemini-3.1-flash-tts-preview',
      openaiTtsModel: 'gpt-4o-mini-tts',
      googleVideoModel: 'veo-3.1-fast-generate-preview',
      openaiVideoModel: '',
    } as Parameters<typeof getDefaultImageModelForProvider>[0] &
      Parameters<typeof getDefaultTtsModelForProvider>[0] &
      Parameters<typeof getDefaultVideoModelForProvider>[0];
    expect(getDefaultImageModelForProvider(config, 'google')).toBe('gemini-3.1-flash-lite-image');
    expect(getDefaultTtsModelForProvider(config, 'mimo')).toBe('mimo-v2.5-tts');
    expect(getDefaultVideoModelForProvider(config, 'google')).toBe('veo-3.1-fast-generate-preview');
  });
});
