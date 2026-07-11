import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mimoCtor, claudeCtor, openaiCtor, googleAiCtor, googleGenAiCtor } = vi.hoisted(() => ({
  mimoCtor: vi.fn(),
  claudeCtor: vi.fn(),
  openaiCtor: vi.fn(),
  googleAiCtor: vi.fn(),
  googleGenAiCtor: vi.fn(),
}));

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn(),
}));

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    constructor(options: unknown) {
      googleGenAiCtor(options);
    }
  },
}));

vi.mock('@mui-gamebook/core/lib/mimo-provider', () => ({
  MimoProvider: class {
    constructor(...args: unknown[]) {
      mimoCtor(...args);
    }
  },
}));

vi.mock('@mui-gamebook/core/lib/claude-provider', () => ({
  ClaudeProvider: class {
    constructor(...args: unknown[]) {
      claudeCtor(...args);
    }
  },
}));

vi.mock('@mui-gamebook/core/lib/openai-provider', () => ({
  OpenAiProvider: class {
    constructor(...args: unknown[]) {
      openaiCtor(...args);
    }
  },
}));

vi.mock('@mui-gamebook/core/lib/google-ai-provider', () => ({
  GoogleAiProvider: class {
    constructor(...args: unknown[]) {
      googleAiCtor(...args);
    }
  },
}));

vi.mock('@/lib/config', () => ({
  getConfig: vi.fn(),
}));

import { getCloudflareContext } from '@opennextjs/cloudflare';
import {
  createAiProvider,
  createGoogleAiProvider,
  resolveImageVideoProviderType,
  resolveTtsProviderType,
} from '@/lib/ai-provider-factory';
import { getConfig } from '@/lib/config';

const BASE_CONFIG = {
  defaultAiProvider: 'google' as const,
  defaultTtsProvider: 'mimo' as const,
  mimoTextModel: 'mimo-v2.5-pro',
  mimoBaseUrl: 'https://token-plan-cn.xiaomimimo.com/v1',
  mimoTtsModel: 'mimo-v2.5-tts',
  anthropicTextModel: 'claude-sonnet-5',
  openaiTextModel: 'gpt-5.5',
  openaiImageModel: 'gpt-image-1.5',
  openaiVideoModel: 'sora-2',
  openaiTtsModel: 'gpt-4o-mini-tts',
  googleTextModel: 'gemini-3.1-pro-preview',
  googleImageModel: 'gemini-3.1-flash-image',
  googleVideoModel: 'veo-3.1-generate-preview',
  googleTtsModel: 'gemini-3.1-flash-tts-preview',
  cfAiGatewayBaseUrl: '',
};

describe('ai-provider-factory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getCloudflareContext as ReturnType<typeof vi.fn>).mockReturnValue({ env: { MIMO_API_KEY: 'tp-test' } });
  });

  it('MiMo 仍需要 MIMO_API_KEY，且不走网关（不要求 cfAiGatewayBaseUrl），带上 tts 模型', async () => {
    (getConfig as ReturnType<typeof vi.fn>).mockResolvedValue(BASE_CONFIG);
    await createAiProvider('mimo');
    expect(mimoCtor).toHaveBeenCalledWith(
      'tp-test',
      { text: 'mimo-v2.5-pro', tts: 'mimo-v2.5-tts' },
      BASE_CONFIG.mimoBaseUrl,
    );
  });

  it('MIMO_API_KEY 缺失时报错', async () => {
    (getCloudflareContext as ReturnType<typeof vi.fn>).mockReturnValue({ env: {} });
    (getConfig as ReturnType<typeof vi.fn>).mockResolvedValue(BASE_CONFIG);
    await expect(createAiProvider('mimo')).rejects.toThrow('MIMO_API_KEY not configured');
  });

  it('未配置 cfAiGatewayBaseUrl 时，Claude/OpenAI/Gemini 均明确报错（不再要求各自的 API Key）', async () => {
    (getConfig as ReturnType<typeof vi.fn>).mockResolvedValue(BASE_CONFIG);
    await expect(createAiProvider('anthropic')).rejects.toThrow('Cloudflare AI Gateway 未配置');
    await expect(createAiProvider('openai')).rejects.toThrow('Cloudflare AI Gateway 未配置');
    await expect(createAiProvider('google')).rejects.toThrow('Cloudflare AI Gateway 未配置');
    await expect(createGoogleAiProvider()).rejects.toThrow('Cloudflare AI Gateway 未配置');
    expect(claudeCtor).not.toHaveBeenCalled();
    expect(openaiCtor).not.toHaveBeenCalled();
    expect(googleGenAiCtor).not.toHaveBeenCalled();
  });

  it('配置网关后，Claude/OpenAI/Gemini 用占位 key + 网关子路径构造，不读取各自的环境变量', async () => {
    const config = { ...BASE_CONFIG, cfAiGatewayBaseUrl: 'https://gateway.ai.cloudflare.com/v1/acc/gw/' };
    (getConfig as ReturnType<typeof vi.fn>).mockResolvedValue(config);
    (getCloudflareContext as ReturnType<typeof vi.fn>).mockReturnValue({
      env: { MIMO_API_KEY: 'tp-test', ANTHROPIC_API_KEY: 'should-be-ignored', OPENAI_API_KEY: 'should-be-ignored' },
    });

    await createAiProvider('anthropic');
    expect(claudeCtor).toHaveBeenCalledWith(
      'cf-ai-gateway-managed',
      { text: 'claude-sonnet-5' },
      { baseURL: 'https://gateway.ai.cloudflare.com/v1/acc/gw/anthropic', headers: {} },
    );

    await createAiProvider('openai');
    expect(openaiCtor.mock.calls[0][0]).toBe('cf-ai-gateway-managed');
    expect(openaiCtor.mock.calls[0][2]).toEqual({
      baseURL: 'https://gateway.ai.cloudflare.com/v1/acc/gw/openai',
      headers: {},
    });

    await createAiProvider('google');
    expect(googleGenAiCtor).toHaveBeenCalledWith({
      apiKey: 'cf-ai-gateway-managed',
      httpOptions: { baseUrl: 'https://gateway.ai.cloudflare.com/v1/acc/gw/google-ai-studio' },
    });
  });

  it('配置 CF_AI_GATEWAY_TOKEN 时，所有经网关的 provider 都带上 cf-aig-authorization header', async () => {
    const config = { ...BASE_CONFIG, cfAiGatewayBaseUrl: 'https://gateway.ai.cloudflare.com/v1/acc/gw' };
    (getConfig as ReturnType<typeof vi.fn>).mockResolvedValue(config);
    (getCloudflareContext as ReturnType<typeof vi.fn>).mockReturnValue({
      env: { MIMO_API_KEY: 'tp-test', CF_AI_GATEWAY_TOKEN: 'cf-token-xyz' },
    });
    const expectedHeader = { 'cf-aig-authorization': 'Bearer cf-token-xyz' };

    await createAiProvider('anthropic');
    expect(claudeCtor.mock.calls[0][2]).toEqual(expect.objectContaining({ headers: expectedHeader }));

    await createAiProvider('openai');
    expect(openaiCtor.mock.calls[0][2]).toEqual(expect.objectContaining({ headers: expectedHeader }));

    await createAiProvider('google');
    expect(googleGenAiCtor.mock.calls[0][0]).toEqual(
      expect.objectContaining({ httpOptions: expect.objectContaining({ headers: expectedHeader }) }),
    );
    expect(googleAiCtor.mock.calls[0][3]).toEqual(expect.objectContaining({ headers: expectedHeader }));

    await createGoogleAiProvider();
    expect(googleGenAiCtor.mock.calls[1][0]).toEqual(
      expect.objectContaining({ httpOptions: expect.objectContaining({ headers: expectedHeader }) }),
    );
  });

  it('未配置 CF_AI_GATEWAY_TOKEN 时不发送 cf-aig-authorization header（未鉴权网关场景）', async () => {
    const config = { ...BASE_CONFIG, cfAiGatewayBaseUrl: 'https://gateway.ai.cloudflare.com/v1/acc/gw' };
    (getConfig as ReturnType<typeof vi.fn>).mockResolvedValue(config);
    (getCloudflareContext as ReturnType<typeof vi.fn>).mockReturnValue({ env: { MIMO_API_KEY: 'tp-test' } });

    await createAiProvider('openai');
    expect(openaiCtor.mock.calls[0][2]).toEqual(expect.objectContaining({ headers: {} }));

    await createAiProvider('google');
    const googleGenAiOptions = googleGenAiCtor.mock.calls[0][0] as { httpOptions: Record<string, unknown> };
    expect(googleGenAiOptions.httpOptions).not.toHaveProperty('headers');
  });

  it('OpenAI/Google 分支也带上各自的 tts 模型（此前是死配置，从未真正传给 provider）', async () => {
    const config = { ...BASE_CONFIG, cfAiGatewayBaseUrl: 'https://gateway.ai.cloudflare.com/v1/acc/gw' };
    (getConfig as ReturnType<typeof vi.fn>).mockResolvedValue(config);

    await createAiProvider('openai');
    expect(openaiCtor.mock.calls[0][1]).toEqual(expect.objectContaining({ tts: 'gpt-4o-mini-tts' }));

    await createAiProvider('google');
    expect(googleAiCtor.mock.calls[0][2]).toEqual(expect.objectContaining({ tts: 'gemini-3.1-flash-tts-preview' }));
  });
});

describe('resolveImageVideoProviderType（图片/视频，只支持 google/openai）', () => {
  beforeEach(() => vi.clearAllMocks());

  it('defaultAiProvider 为 google/openai 时原样返回', async () => {
    (getConfig as ReturnType<typeof vi.fn>).mockResolvedValue({ ...BASE_CONFIG, defaultAiProvider: 'openai' });
    expect(await resolveImageVideoProviderType()).toBe('openai');
  });

  it('defaultAiProvider 为 mimo/anthropic 时回退 google', async () => {
    (getConfig as ReturnType<typeof vi.fn>).mockResolvedValue({ ...BASE_CONFIG, defaultAiProvider: 'mimo' });
    expect(await resolveImageVideoProviderType()).toBe('google');

    (getConfig as ReturnType<typeof vi.fn>).mockResolvedValue({ ...BASE_CONFIG, defaultAiProvider: 'anthropic' });
    expect(await resolveImageVideoProviderType()).toBe('google');
  });
});

describe('resolveTtsProviderType（TTS，独立于 defaultAiProvider，三选一）', () => {
  beforeEach(() => vi.clearAllMocks());

  it('读取独立的 defaultTtsProvider 配置，与 defaultAiProvider 无关', async () => {
    (getConfig as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...BASE_CONFIG,
      defaultAiProvider: 'google',
      defaultTtsProvider: 'mimo',
    });
    expect(await resolveTtsProviderType()).toBe('mimo');
  });

  it('三个合法值原样返回', async () => {
    for (const provider of ['google', 'openai', 'mimo'] as const) {
      (getConfig as ReturnType<typeof vi.fn>).mockResolvedValue({ ...BASE_CONFIG, defaultTtsProvider: provider });
      expect(await resolveTtsProviderType()).toBe(provider);
    }
  });

  it('非法值（如遗留数据里的 anthropic）回退 mimo', async () => {
    (getConfig as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...BASE_CONFIG,
      defaultTtsProvider: 'anthropic' as never,
    });
    expect(await resolveTtsProviderType()).toBe('mimo');
  });
});
