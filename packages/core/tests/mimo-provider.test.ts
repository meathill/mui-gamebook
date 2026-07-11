import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createMock, constructorSpy } = vi.hoisted(() => ({
  createMock: vi.fn(),
  constructorSpy: vi.fn(),
}));

vi.mock('openai', () => ({
  default: class {
    chat = { completions: { create: createMock } };
    constructor(options: unknown) {
      constructorSpy(options);
    }
  },
}));

import { MIMO_DEFAULT_BASE_URL, MIMO_DEFAULT_TEXT_MODEL, MimoProvider } from '../lib/mimo-provider';

describe('MimoProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createMock.mockResolvedValue({
      choices: [{ message: { content: '你好' } }],
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
    });
  });

  it('默认使用 Token Plan base URL，type 为 mimo', () => {
    const provider = new MimoProvider('tp-test-key');
    expect(provider.type).toBe('mimo');
    expect(constructorSpy).toHaveBeenCalledWith({
      apiKey: 'tp-test-key',
      baseURL: MIMO_DEFAULT_BASE_URL,
    });
  });

  it('支持自定义 base URL', () => {
    new MimoProvider('sk-test-key', {}, 'https://api.xiaomimimo.com/v1');
    expect(constructorSpy).toHaveBeenCalledWith({
      apiKey: 'sk-test-key',
      baseURL: 'https://api.xiaomimimo.com/v1',
    });
  });

  it('generateText 使用默认模型且不发送 reasoning_effort', async () => {
    const provider = new MimoProvider('tp-test-key');
    const result = await provider.generateText('写一个故事', { thinking: true });

    expect(createMock).toHaveBeenCalledTimes(1);
    const request = createMock.mock.calls[0][0];
    expect(request.model).toBe(MIMO_DEFAULT_TEXT_MODEL);
    expect(request).not.toHaveProperty('reasoning_effort');
    expect(result.text).toBe('你好');
    expect(result.usage).toEqual({ promptTokens: 10, completionTokens: 20, totalTokens: 30 });
  });

  it('generateText 支持自定义模型', async () => {
    const provider = new MimoProvider('tp-test-key', { text: 'mimo-v3-pro' });
    await provider.generateText('测试');
    expect(createMock.mock.calls[0][0].model).toBe('mimo-v3-pro');
  });

  it('chatWithTools 继承 OpenAI 协议并解析 tool_calls', async () => {
    createMock.mockResolvedValue({
      choices: [
        {
          message: {
            content: null,
            tool_calls: [{ function: { name: 'addCharacter', arguments: '{"id":"hero","name":"勇者"}' } }],
          },
        },
      ],
      usage: { prompt_tokens: 5, completion_tokens: 8, total_tokens: 13 },
    });

    const provider = new MimoProvider('tp-test-key');
    const result = await provider.chatWithTools(
      [{ role: 'user', content: '加个角色' }],
      [{ name: 'addCharacter', description: '添加角色', parameters: { type: 'object', properties: {} } }],
    );

    expect(result.functionCalls).toEqual([{ name: 'addCharacter', args: { id: 'hero', name: '勇者' } }]);
  });

  it('不支持图片/视频/TTS 生成', async () => {
    const provider = new MimoProvider('tp-test-key');
    await expect(provider.generateImage()).rejects.toThrow('MiMo 不支持图片生成');
    await expect(provider.startVideoGeneration()).rejects.toThrow('MiMo 不支持视频生成');
    await expect(provider.checkVideoGenerationStatus()).rejects.toThrow('MiMo 不支持视频生成');
    await expect(provider.generateTTS()).rejects.toThrow('MiMo 不支持 TTS 生成');
  });
});
