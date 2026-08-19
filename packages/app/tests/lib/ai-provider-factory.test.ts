import { beforeEach, describe, expect, it, vi } from 'vitest';

const { opencodeCtor, mimoCtor, claudeCtor, openaiCtor, googleAiCtor, googleGenAiCtor } = vi.hoisted(() => ({
  opencodeCtor: vi.fn(),
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

vi.mock('@mui-gamebook/core/lib/opencode-provider', () => ({
  OpencodeProvider: class {
    constructor(...args: unknown[]) {
      opencodeCtor(...args);
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
  resolveImageProviderType,
  resolveImageVideoProviderType,
  resolveTextProviderType,
  resolveTtsProviderType,
  resolveVideoProviderType,
} from '@/lib/ai-provider-factory';
import { getConfig } from '@/lib/config';

const BASE_CONFIG = {
  defaultTextProvider: 'opencode' as const,
  defaultAiProvider: 'opencode' as const,
  defaultTtsProvider: 'mimo' as const,
  defaultImageProvider: 'google' as const,
  defaultVideoProvider: 'google' as const,
  defaultSttProvider: 'openai' as const,
  defaultMusicProvider: 'internal' as const,
  defaultSfxProvider: 'internal' as const,
  musicModel: 'suno-v4',
  sfxModel: 'eleven-sfx-v1',
  opencodeTextModel: 'deepseek-v4-flash',
  opencodeBaseUrl: 'https://opencode.ai/zen/go/v1',
  mimoTextModel: 'mimo-v2.5-pro',
  mimoBaseUrl: 'https://token-plan-cn.xiaomimimo.com/v1',
  mimoTtsModel: 'mimo-v2.5-tts',
  anthropicTextModel: 'claude-sonnet-5',
  openaiTextModel: 'gpt-5.6-luna',
  openaiImageModel: 'gpt-image-1.5',
  openaiVideoModel: '',
  openaiTtsModel: 'gpt-4o-mini-tts',
  googleTextModel: 'gemini-3.7-flash',
  googleImageModel: 'gemini-3.1-flash-lite-image',
  googleVideoModel: 'veo-3.1-fast-generate-preview',
  googleTtsModel: 'gemini-3.1-flash-tts-preview',
  cfAiGatewayBaseUrl: '',
};

describe('ai-provider-factory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getCloudflareContext as ReturnType<typeof vi.fn>).mockReturnValue({
      env: { MIMO_API_KEY: 'tp-test', OPENCODE_API_KEY: 'opencode-test' },
    });
  });

  it('OpenCode 需要 OPENCODE_API_KEY，且直连官方不走 AI Gateway', async () => {
    (getConfig as ReturnType<typeof vi.fn>).mockResolvedValue(BASE_CONFIG);
    await createAiProvider('opencode');
    expect(opencodeCtor).toHaveBeenCalledWith(
      'opencode-test',
      { text: 'deepseek-v4-flash' },
      BASE_CONFIG.opencodeBaseUrl,
    );
  });

  it('OPENCODE_API_KEY 缺失时报错', async () => {
    (getCloudflareContext as ReturnType<typeof vi.fn>).mockReturnValue({ env: {} });
    (getConfig as ReturnType<typeof vi.fn>).mockResolvedValue(BASE_CONFIG);
    await expect(createAiProvider('opencode')).rejects.toThrow('OPENCODE_API_KEY not configured');
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

describe('模态独立 Provider 解析函数', () => {
  beforeEach(() => vi.clearAllMocks());

  it('resolveTextProviderType: 读取 defaultTextProvider', async () => {
    (getConfig as ReturnType<typeof vi.fn>).mockResolvedValue({ ...BASE_CONFIG, defaultTextProvider: 'opencode' });
    expect(await resolveTextProviderType()).toBe('opencode');
  });

  it('resolveImageProviderType: 读取 defaultImageProvider', async () => {
    (getConfig as ReturnType<typeof vi.fn>).mockResolvedValue({ ...BASE_CONFIG, defaultImageProvider: 'openai' });
    expect(await resolveImageProviderType()).toBe('openai');
    expect(await resolveImageVideoProviderType()).toBe('openai');
  });

  it('resolveVideoProviderType: 读取 defaultVideoProvider', async () => {
    (getConfig as ReturnType<typeof vi.fn>).mockResolvedValue({ ...BASE_CONFIG, defaultVideoProvider: 'google' });
    expect(await resolveVideoProviderType()).toBe('google');
  });

  it('resolveTtsProviderType: 读取独立的 defaultTtsProvider', async () => {
    (getConfig as ReturnType<typeof vi.fn>).mockResolvedValue({ ...BASE_CONFIG, defaultTtsProvider: 'mimo' });
    expect(await resolveTtsProviderType()).toBe('mimo');
  });
});
