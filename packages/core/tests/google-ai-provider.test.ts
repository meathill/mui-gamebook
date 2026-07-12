import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GoogleAiProvider } from '../lib/google-ai-provider';

function fakeGenAI(
  overrides: { generateContent?: ReturnType<typeof vi.fn>; generateVideos?: ReturnType<typeof vi.fn> } = {},
) {
  return {
    models: {
      generateContent: overrides.generateContent ?? vi.fn(),
      generateVideos: overrides.generateVideos ?? vi.fn(),
    },
  };
}

const usageMetadata = { promptTokenCount: 10, candidatesTokenCount: 20, totalTokenCount: 30 };

describe('GoogleAiProvider', () => {
  it('type 为 google', () => {
    const provider = new GoogleAiProvider(fakeGenAI() as never, 'key');
    expect(provider.type).toBe('google');
  });

  describe('generateText', () => {
    it('默认模型 gemini-2.5-flash，usage 正确映射', async () => {
      const generateContent = vi.fn().mockResolvedValue({ text: '从前有座山', usageMetadata });
      const provider = new GoogleAiProvider(fakeGenAI({ generateContent }) as never, 'key');

      const result = await provider.generateText('写故事');

      expect(generateContent.mock.calls[0][0].model).toBe('gemini-2.5-flash');
      expect(result.text).toBe('从前有座山');
      expect(result.usage).toEqual({ promptTokens: 10, completionTokens: 20, totalTokens: 30 });
    });

    it('response.text 为空时返回空字符串', async () => {
      const generateContent = vi.fn().mockResolvedValue({ usageMetadata: {} });
      const provider = new GoogleAiProvider(fakeGenAI({ generateContent }) as never, 'key');

      const result = await provider.generateText('写故事');

      expect(result.text).toBe('');
      expect(result.usage).toEqual({ promptTokens: 0, completionTokens: 0, totalTokens: 0 });
    });

    it('不开启 thinking 时不传 thinkingConfig', async () => {
      const generateContent = vi.fn().mockResolvedValue({ text: 'x', usageMetadata });
      const provider = new GoogleAiProvider(fakeGenAI({ generateContent }) as never, 'key');

      await provider.generateText('写故事');

      expect(generateContent.mock.calls[0][0].config).toBeUndefined();
    });

    it('2.5 系列模型开启 thinking 时使用 thinkingBudget', async () => {
      const generateContent = vi.fn().mockResolvedValue({ text: 'x', usageMetadata });
      const provider = new GoogleAiProvider(fakeGenAI({ generateContent }) as never, 'key', {
        text: 'gemini-2.5-flash',
      });

      await provider.generateText('写故事', { thinking: true });

      expect(generateContent.mock.calls[0][0].config).toEqual({ thinkingConfig: { thinkingBudget: 8192 } });
    });

    it('3 系列 flash 模型开启 thinking 时使用 thinkingLevel MEDIUM', async () => {
      const generateContent = vi.fn().mockResolvedValue({ text: 'x', usageMetadata });
      const provider = new GoogleAiProvider(fakeGenAI({ generateContent }) as never, 'key', {
        text: 'gemini-3-flash',
      });

      await provider.generateText('写故事', { thinking: true });

      expect(generateContent.mock.calls[0][0].config).toEqual({ thinkingConfig: { thinkingLevel: 'MEDIUM' } });
    });

    it('3 系列 pro（非 flash）模型开启 thinking 时使用 thinkingLevel HIGH', async () => {
      const generateContent = vi.fn().mockResolvedValue({ text: 'x', usageMetadata });
      const provider = new GoogleAiProvider(fakeGenAI({ generateContent }) as never, 'key', { text: 'gemini-3-pro' });

      await provider.generateText('写故事', { thinking: true });

      expect(generateContent.mock.calls[0][0].config).toEqual({ thinkingConfig: { thinkingLevel: 'HIGH' } });
    });
  });

  describe('generateImage', () => {
    function imageResponse(overrides: Record<string, unknown> = {}) {
      return {
        usageMetadata,
        candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: 'YWJj' } }] } }],
        ...overrides,
      };
    }

    beforeEach(() => {
      vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('没有参考图片时 contents 只包含 prompt 文本', async () => {
      const generateContent = vi.fn().mockResolvedValue(imageResponse());
      const provider = new GoogleAiProvider(fakeGenAI({ generateContent }) as never, 'key');

      await provider.generateImage('一只猫');

      expect(generateContent.mock.calls[0][0].contents).toEqual([{ text: '一只猫' }]);
      expect(generateContent.mock.calls[0][0].config.imageConfig.aspectRatio).toBe('1:1');
    });

    it('自定义 aspectRatio 会透传', async () => {
      const generateContent = vi.fn().mockResolvedValue(imageResponse());
      const provider = new GoogleAiProvider(fakeGenAI({ generateContent }) as never, 'key');

      await provider.generateImage('一只猫', { aspectRatio: '16:9' });

      expect(generateContent.mock.calls[0][0].config.imageConfig.aspectRatio).toBe('16:9');
    });

    it('有参考图片时下载并 base64 编码，附加一致性提示文本', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        headers: { get: () => 'image/jpeg' },
        arrayBuffer: () => Promise.resolve(new TextEncoder().encode('fake-image-bytes').buffer),
      } as unknown as Response);
      const generateContent = vi.fn().mockResolvedValue(imageResponse());
      const provider = new GoogleAiProvider(fakeGenAI({ generateContent }) as never, 'key');

      await provider.generateImage('一只猫', { referenceImages: ['https://x.com/ref.jpg'] });

      const contents = generateContent.mock.calls[0][0].contents;
      expect(contents[0].inlineData.mimeType).toBe('image/jpeg');
      expect(contents[1].text).toContain('一只猫');
      expect(contents[1].text).toContain('maintain character consistency');
    });

    it('参考图片下载失败时跳过该图片，不中断整体流程', async () => {
      vi.mocked(fetch).mockResolvedValue({ ok: false } as Response);
      const generateContent = vi.fn().mockResolvedValue(imageResponse());
      const provider = new GoogleAiProvider(fakeGenAI({ generateContent }) as never, 'key');

      await provider.generateImage('一只猫', { referenceImages: ['https://x.com/bad.jpg'] });

      const contents = generateContent.mock.calls[0][0].contents;
      expect(contents).toHaveLength(1);
      expect(contents[0].text).toContain('一只猫');
    });

    it('没有 candidates 时抛出异常', async () => {
      const generateContent = vi.fn().mockResolvedValue(imageResponse({ candidates: [] }));
      const provider = new GoogleAiProvider(fakeGenAI({ generateContent }) as never, 'key');

      await expect(provider.generateImage('x')).rejects.toThrow('No candidates received from Google AI.');
    });

    it('candidate 没有 content.parts 时抛出异常', async () => {
      const generateContent = vi.fn().mockResolvedValue(imageResponse({ candidates: [{ content: {} }] }));
      const provider = new GoogleAiProvider(fakeGenAI({ generateContent }) as never, 'key');

      await expect(provider.generateImage('x')).rejects.toThrow('No content parts received from Google AI.');
    });

    it('没有任何 part 带 inlineData 时抛出异常', async () => {
      const generateContent = vi
        .fn()
        .mockResolvedValue(imageResponse({ candidates: [{ content: { parts: [{ text: 'oops' }] } }] }));
      const provider = new GoogleAiProvider(fakeGenAI({ generateContent }) as never, 'key');

      await expect(provider.generateImage('x')).rejects.toThrow('No image data received from Google AI.');
    });

    it('成功时返回 mimeType/buffer/usage', async () => {
      const generateContent = vi.fn().mockResolvedValue(imageResponse());
      const provider = new GoogleAiProvider(fakeGenAI({ generateContent }) as never, 'key');

      const result = await provider.generateImage('x');

      expect(result.type).toBe('image/png');
      expect(result.buffer.toString('base64')).toBe('YWJj');
      expect(result.usage).toEqual({ promptTokens: 10, completionTokens: 20, totalTokens: 30 });
    });
  });

  describe('startVideoGeneration', () => {
    it('返回 operationName 和固定的 usage 估算', async () => {
      const generateVideos = vi.fn().mockResolvedValue({ name: 'operations/abc123' });
      const provider = new GoogleAiProvider(fakeGenAI({ generateVideos }) as never, 'key');

      const result = await provider.startVideoGeneration('一只猫跑步');

      expect(result.operationName).toBe('operations/abc123');
      expect(result.usage).toEqual({ promptTokens: 0, completionTokens: 0, totalTokens: 50_000 });
    });

    it('没有 operation.name 时抛出异常', async () => {
      const generateVideos = vi.fn().mockResolvedValue({});
      const provider = new GoogleAiProvider(fakeGenAI({ generateVideos }) as never, 'key');

      await expect(provider.startVideoGeneration('x')).rejects.toThrow('无法获取操作名称');
    });
  });

  describe('checkVideoGenerationStatus', () => {
    beforeEach(() => {
      vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('HTTP 非 ok 时返回 done:false 和错误信息', async () => {
      vi.mocked(fetch).mockResolvedValue({ ok: false, status: 500, text: () => Promise.resolve('boom') } as Response);
      const provider = new GoogleAiProvider(fakeGenAI() as never, 'key');

      const result = await provider.checkVideoGenerationStatus('operations/abc');

      expect(result).toEqual({ done: false, error: 'HTTP error! status: 500 boom' });
    });

    it('任务进行中时返回 done:false', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ done: false, metadata: { progressPercent: 40 } }),
      } as Response);
      const provider = new GoogleAiProvider(fakeGenAI() as never, 'key');

      const result = await provider.checkVideoGenerationStatus('operations/abc');

      expect(result).toEqual({ done: false });
    });

    it('任务失败时返回 done:true 和错误信息', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ done: true, error: { message: '生成失败' } }),
      } as Response);
      const provider = new GoogleAiProvider(fakeGenAI() as never, 'key');

      const result = await provider.checkVideoGenerationStatus('operations/abc');

      expect(result).toEqual({ done: true, error: '生成失败' });
    });

    it('任务成功时返回 done:true 和视频 uri', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            done: true,
            response: { generateVideoResponse: { generatedSamples: [{ video: { uri: 'https://x.com/v.mp4' } }] } },
          }),
      } as Response);
      const provider = new GoogleAiProvider(fakeGenAI() as never, 'key');

      const result = await provider.checkVideoGenerationStatus('operations/abc');

      expect(result).toEqual({ done: true, uri: 'https://x.com/v.mp4' });
    });

    it('任务成功但没有视频 uri 时返回错误（可选链短路，不抛异常）', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ done: true, response: undefined }),
      } as Response);
      const provider = new GoogleAiProvider(fakeGenAI() as never, 'key');

      const result = await provider.checkVideoGenerationStatus('operations/abc');

      expect(result).toEqual({ done: true, error: '视频 URI 不存在' });
    });

    it('请求抛出异常时返回轮询出错', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('network down'));
      const provider = new GoogleAiProvider(fakeGenAI() as never, 'key');

      const result = await provider.checkVideoGenerationStatus('operations/abc');

      expect(result).toEqual({ done: false, error: '轮询请求出错' });
    });
  });

  describe('generateMiniGame', () => {
    it('剥离代码块标记并去除首尾空白', async () => {
      const generateContent = vi.fn().mockResolvedValue({
        text: '```javascript\nexport default {};\n```',
        usageMetadata,
      });
      const provider = new GoogleAiProvider(fakeGenAI({ generateContent }) as never, 'key');

      const result = await provider.generateMiniGame('猜数字');

      expect(result.code).toBe('export default {};');
    });

    it('剥离后代码为空时抛出异常', async () => {
      const generateContent = vi.fn().mockResolvedValue({ text: '```javascript\n\n```', usageMetadata });
      const provider = new GoogleAiProvider(fakeGenAI({ generateContent }) as never, 'key');

      await expect(provider.generateMiniGame('猜数字')).rejects.toThrow('AI 未返回有效的游戏代码');
    });
  });

  describe('chatWithTools', () => {
    const tools = [
      {
        name: 'addCharacter',
        description: '添加角色',
        parameters: { type: 'object' as const, properties: {}, required: [] },
      },
    ];

    it('role 映射：model 保留，其余（包括 user）映射为 user', async () => {
      const generateContent = vi.fn().mockResolvedValue({ usageMetadata, candidates: [] });
      const provider = new GoogleAiProvider(fakeGenAI({ generateContent }) as never, 'key');

      await provider.chatWithTools(
        [
          { role: 'user', content: '你好' },
          { role: 'model', content: '你好呀' },
        ],
        [],
      );

      expect(generateContent.mock.calls[0][0].contents).toEqual([
        { role: 'user', parts: [{ text: '你好' }] },
        { role: 'model', parts: [{ text: '你好呀' }] },
      ]);
    });

    it('候选为空时只返回 usage', async () => {
      const generateContent = vi.fn().mockResolvedValue({ usageMetadata, candidates: [] });
      const provider = new GoogleAiProvider(fakeGenAI({ generateContent }) as never, 'key');

      const result = await provider.chatWithTools([{ role: 'user', content: 'x' }], tools);

      expect(result).toEqual({ usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 } });
    });

    it('解析文本和 functionCall part', async () => {
      const generateContent = vi.fn().mockResolvedValue({
        usageMetadata,
        candidates: [
          {
            content: {
              parts: [{ text: '我来添加角色' }, { functionCall: { name: 'addCharacter', args: { id: 'hero' } } }],
            },
          },
        ],
      });
      const provider = new GoogleAiProvider(fakeGenAI({ generateContent }) as never, 'key');

      const result = await provider.chatWithTools([{ role: 'user', content: 'x' }], tools);

      expect(result.text).toBe('我来添加角色');
      expect(result.functionCalls).toEqual([{ name: 'addCharacter', args: { id: 'hero' } }]);
    });
  });

  describe('generateTTS', () => {
    it('返回音频 buffer 和固定 mimeType', async () => {
      const generateContent = vi.fn().mockResolvedValue({
        candidates: [{ content: { parts: [{ inlineData: { data: 'YWJj' } }] } }],
      });
      const provider = new GoogleAiProvider(fakeGenAI({ generateContent }) as never, 'key');

      const result = await provider.generateTTS('你好呀');

      expect(result.mimeType).toBe('audio/pcm');
      expect(result.buffer.toString('base64')).toBe('YWJj');
    });

    it('没有音频数据时抛出异常', async () => {
      const generateContent = vi.fn().mockResolvedValue({ candidates: [] });
      const provider = new GoogleAiProvider(fakeGenAI({ generateContent }) as never, 'key');

      await expect(provider.generateTTS('你好呀')).rejects.toThrow('TTS 生成失败：未返回音频数据');
    });
  });
});
