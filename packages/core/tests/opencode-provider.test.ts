import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OPENCODE_DEFAULT_BASE_URL, OPENCODE_DEFAULT_TEXT_MODEL, OpencodeProvider } from '../lib/opencode-provider';

describe('OpencodeProvider', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('使用默认配置构造', () => {
    const provider = new OpencodeProvider('test-key');
    expect(provider.type).toBe('opencode');
  });

  it('generateText 成功调用并返回文本与用量', async () => {
    const fakeResponse = {
      choices: [
        {
          message: {
            content: '这是 DeepSeek 生成的内容',
          },
        },
      ],
      usage: {
        prompt_tokens: 15,
        completion_tokens: 30,
        total_tokens: 45,
      },
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(fakeResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const provider = new OpencodeProvider('test-key', { text: 'deepseek-v4-flash' });
    const result = await provider.generateText('你好');

    expect(result.text).toBe('这是 DeepSeek 生成的内容');
    expect(result.usage).toEqual({
      promptTokens: 15,
      completionTokens: 30,
      totalTokens: 45,
    });
  });

  it('generateText 请求失败抛出错误', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Unauthorized', {
        status: 401,
      }),
    );

    const provider = new OpencodeProvider('test-key');
    await expect(provider.generateText('你好')).rejects.toThrow('OpenCode 生成请求失败: 401 Unauthorized');
  });

  it('不支持生图、视频与 TTS，明确报错', async () => {
    const provider = new OpencodeProvider('test-key');
    await expect(provider.generateImage()).rejects.toThrow('OpenCode 不支持图片生成');
    await expect(provider.startVideoGeneration('test')).rejects.toThrow('OpenCode 不支持视频生成');
    await expect(provider.generateTTS()).rejects.toThrow('OpenCode 不支持 TTS 语音合成');
  });
});
