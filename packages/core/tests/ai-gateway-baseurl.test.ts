/**
 * AI Gateway 场景：SDK 之外的裸 fetch（Sora / Veo 轮询）也必须走自定义 base URL
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GoogleGenAI } from '@google/genai';

vi.mock('openai', () => ({
  default: class {
    chat = { completions: { create: vi.fn() } };
  },
}));

import { GoogleAiProvider } from '../lib/google-ai-provider';
import { OpenAiProvider } from '../lib/openai-provider';

const GATEWAY = 'https://gateway.ai.cloudflare.com/v1/acc/gw';

describe('裸 fetch 走自定义 base URL', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('OpenAiProvider Sora 视频请求走 baseURL（默认官方，配置后走网关）', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'video-op-1' }),
    });

    const direct = new OpenAiProvider('sk-test');
    await direct.startVideoGeneration('一段视频');
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.openai.com/v1/videos/generations');

    const viaGateway = new OpenAiProvider('sk-test', {}, { baseURL: `${GATEWAY}/openai` });
    await viaGateway.startVideoGeneration('一段视频');
    expect(fetchMock.mock.calls[1][0]).toBe(`${GATEWAY}/openai/videos/generations`);

    await viaGateway.checkVideoGenerationStatus('video-op-1');
    expect(fetchMock.mock.calls[2][0]).toBe(`${GATEWAY}/openai/videos/generations/video-op-1`);
  });

  it('GoogleAiProvider 视频轮询走 apiBaseUrl（默认官方，配置后走网关）', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ done: false }),
    });

    const dummyGenAI = {} as GoogleGenAI;

    const direct = new GoogleAiProvider(dummyGenAI, 'g-key');
    await direct.checkVideoGenerationStatus('operations/op-1');
    expect(fetchMock.mock.calls[0][0]).toBe('https://generativelanguage.googleapis.com/v1beta/operations/op-1');

    const viaGateway = new GoogleAiProvider(dummyGenAI, 'g-key', {}, { apiBaseUrl: `${GATEWAY}/google-ai-studio` });
    await viaGateway.checkVideoGenerationStatus('operations/op-1');
    expect(fetchMock.mock.calls[1][0]).toBe(`${GATEWAY}/google-ai-studio/v1beta/operations/op-1`);
  });

  it('配置了 gateway headers 时，OpenAI/Google 的裸 fetch 都带上 cf-aig-authorization', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ id: 'x', done: false }) });
    const gatewayHeaders = { 'cf-aig-authorization': 'Bearer cf-token' };

    const openai = new OpenAiProvider('sk-test', {}, { baseURL: `${GATEWAY}/openai`, headers: gatewayHeaders });
    await openai.startVideoGeneration('视频');
    expect(fetchMock.mock.calls[0][1].headers).toMatchObject(gatewayHeaders);

    await openai.checkVideoGenerationStatus('op-1');
    expect(fetchMock.mock.calls[1][1].headers).toMatchObject(gatewayHeaders);

    const google = new GoogleAiProvider(
      {} as GoogleGenAI,
      'g-key',
      {},
      { apiBaseUrl: `${GATEWAY}/google-ai-studio`, headers: gatewayHeaders },
    );
    await google.checkVideoGenerationStatus('operations/op-1');
    expect(fetchMock.mock.calls[2][1].headers).toMatchObject(gatewayHeaders);
  });
});
