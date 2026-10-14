import { beforeEach, describe, expect, it, vi } from 'vitest';

const { constructorSpy } = vi.hoisted(() => ({ constructorSpy: vi.fn() }));

vi.mock('openai', () => ({
  default: class {
    chat = { completions: { create: vi.fn() } };
    constructor(options: unknown) {
      constructorSpy(options);
    }
  },
}));

import { OpenAiProvider } from '../lib/openai-provider';

describe('OpenAiProvider headers（AI Gateway 鉴权场景）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('配置 headers 时透传为 defaultHeaders，未配置时不传该字段', () => {
    new OpenAiProvider('sk-test', {}, { headers: { 'cf-aig-authorization': 'Bearer cf-token' } });
    expect(constructorSpy).toHaveBeenLastCalledWith({
      apiKey: 'sk-test',
      dangerouslyAllowBrowser: true,
      defaultHeaders: { 'cf-aig-authorization': 'Bearer cf-token' },
    });

    new OpenAiProvider('sk-test');
    expect(constructorSpy).toHaveBeenLastCalledWith({ apiKey: 'sk-test', dangerouslyAllowBrowser: true });

    new OpenAiProvider('sk-test', {}, { headers: {} });
    expect(constructorSpy).toHaveBeenLastCalledWith({ apiKey: 'sk-test', dangerouslyAllowBrowser: true });
  });
});

function chatCreate(provider: OpenAiProvider) {
  return (
    provider as unknown as {
      client: { chat: { completions: { create: ReturnType<typeof vi.fn> } } };
    }
  ).client.chat.completions.create;
}

describe('OpenAiProvider 实际服务模型', () => {
  it('响应 model 优先于请求模型', async () => {
    const provider = new OpenAiProvider('sk-test', { text: 'gpt-4o' });
    chatCreate(provider).mockResolvedValue({
      model: 'gpt-4o-2024-08-06',
      choices: [{ message: { content: 'ok' } }],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    });

    const result = await provider.generateText('hi');

    expect(result.model).toBe('gpt-4o-2024-08-06');
  });

  it('响应没有 model 时记请求模型', async () => {
    const provider = new OpenAiProvider('sk-test', { text: 'gpt-4o' });
    chatCreate(provider).mockResolvedValue({
      choices: [{ message: { content: 'ok' } }],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    });

    const result = await provider.generateText('hi');

    expect(result.model).toBe('gpt-4o');
  });

  it('chat 没有 choice 时仍带回服务模型', async () => {
    const provider = new OpenAiProvider('sk-test', { text: 'gpt-4o' });
    chatCreate(provider).mockResolvedValue({
      model: 'gpt-4o-gateway',
      choices: [],
      usage: { prompt_tokens: 3, completion_tokens: 0, total_tokens: 3 },
    });

    const result = await provider.chatWithTools([{ role: 'user', content: 'hi' }], []);

    expect(result).toEqual({
      usage: { promptTokens: 3, completionTokens: 0, totalTokens: 3 },
      model: 'gpt-4o-gateway',
    });
  });
});
