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

describe('OpenAiProvider 多轮工具调用', () => {
  it('映射 assistant tool_calls 与 tool 消息，并回传 tool call id', async () => {
    const provider = new OpenAiProvider('sk-test', { text: 'gpt-4o' });
    chatCreate(provider).mockResolvedValue({
      choices: [
        {
          message: {
            content: 'ok',
            tool_calls: [
              {
                id: 'call_1',
                type: 'function',
                function: { name: 'getScene', arguments: '{"sceneId":"start"}' },
              },
            ],
          },
        },
      ],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    });

    const result = await provider.chatWithTools(
      [
        { role: 'user', content: 'hi' },
        { role: 'model', content: '', toolCalls: [{ id: 'call_0', name: 'listScenes', args: {} }] },
        { role: 'tool', content: '{"ok":true}', toolCallId: 'call_0', name: 'listScenes' },
      ],
      [],
    );

    const request = chatCreate(provider).mock.calls[0][0];
    expect(request.messages[1]).toEqual({
      role: 'assistant',
      content: '',
      tool_calls: [
        {
          id: 'call_0',
          type: 'function',
          function: { name: 'listScenes', arguments: '{}' },
        },
      ],
    });
    expect(request.messages[2]).toEqual({
      role: 'tool',
      tool_call_id: 'call_0',
      content: '{"ok":true}',
    });
    expect(result.functionCalls?.[0]).toMatchObject({
      id: 'call_1',
      name: 'getScene',
      args: { sceneId: 'start' },
    });
  });
});
