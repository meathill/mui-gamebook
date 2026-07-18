import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

import {
  MIMO_DEFAULT_BASE_URL,
  MIMO_DEFAULT_TEXT_MODEL,
  MIMO_DEFAULT_TTS_MODEL,
  MIMO_FAST_TEXT_MODEL,
  MimoProvider,
} from '../lib/mimo-provider';

/** 构造一个假的 SSE Response，body 依次吐出给定的 data 行，最后附加 [DONE] */
function makeSseResponse(dataLines: string[]): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const line of dataLines) {
        controller.enqueue(encoder.encode(`data: ${line}\n\n`));
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });
  return { ok: true, body } as unknown as Response;
}

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

  describe('generateText', () => {
    const fetchMock = vi.fn();

    beforeEach(() => {
      vi.stubGlobal('fetch', fetchMock);
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '你好' } }],
          usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
        }),
      });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('走裸 fetch，不通过 OpenAI SDK，且不发送 reasoning_effort', async () => {
      const provider = new MimoProvider('tp-test-key');
      const result = await provider.generateText('写一个故事', { thinking: true });

      expect(createMock).not.toHaveBeenCalled();
      expect(fetchMock.mock.calls[0][0]).toBe(`${MIMO_DEFAULT_BASE_URL}/chat/completions`);
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.model).toBe(MIMO_DEFAULT_TEXT_MODEL);
      expect(body).not.toHaveProperty('reasoning_effort');
      expect(result.text).toBe('你好');
      expect(result.usage).toEqual({ promptTokens: 10, completionTokens: 20, totalTokens: 30 });
    });

    it('默认（或 thinking !== false）开启深度思考，且不设 max_completion_tokens 上限', async () => {
      const provider = new MimoProvider('tp-test-key');
      await provider.generateText('写一个故事');

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.thinking).toEqual({ type: 'enabled' });
      expect(body).not.toHaveProperty('max_completion_tokens');
    });

    it('thinking: false 时显式关闭深度思考', async () => {
      const provider = new MimoProvider('tp-test-key');
      await provider.generateText('写一个故事', { thinking: false });

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.thinking).toEqual({ type: 'disabled' });
    });

    it('显式传 maxOutputTokens 时才携带 max_completion_tokens', async () => {
      const provider = new MimoProvider('tp-test-key', { text: 'mimo-v3-pro' });
      await provider.generateText('测试', { maxOutputTokens: 500 });

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.model).toBe('mimo-v3-pro');
      expect(body.max_completion_tokens).toBe(500);
    });

    it('options.model 覆盖构造函数配置的模型（用于评估等轻量调用换用更快的模型）', async () => {
      const provider = new MimoProvider('tp-test-key', { text: 'mimo-v3-pro' });
      await provider.generateText('测试', { model: MIMO_FAST_TEXT_MODEL });

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.model).toBe(MIMO_FAST_TEXT_MODEL);
    });

    it('请求失败时抛出明确错误', async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 401, text: async () => 'unauthorized' });
      const provider = new MimoProvider('tp-test-key');
      await expect(provider.generateText('文本')).rejects.toThrow('MiMo 生成请求失败: 401 unauthorized');
    });
  });

  describe('generateTextStream', () => {
    const fetchMock = vi.fn();

    beforeEach(() => {
      vi.stubGlobal('fetch', fetchMock);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('依次产出 reasoning/content 增量，结束时返回完整文本与用量', async () => {
      fetchMock.mockResolvedValue(
        makeSseResponse([
          JSON.stringify({ choices: [{ delta: { reasoning_content: '思考中' } }] }),
          JSON.stringify({ choices: [{ delta: { content: '正文' } }] }),
          JSON.stringify({ choices: [{ delta: { content: '继续' } }] }),
          JSON.stringify({ choices: [], usage: { prompt_tokens: 5, completion_tokens: 6, total_tokens: 11 } }),
        ]),
      );

      const provider = new MimoProvider('tp-test-key');
      const gen = provider.generateTextStream('写故事');

      const chunks: { type: string; delta: string }[] = [];
      let result = await gen.next();
      while (!result.done) {
        chunks.push(result.value);
        result = await gen.next();
      }

      expect(chunks).toEqual([
        { type: 'reasoning', delta: '思考中' },
        { type: 'content', delta: '正文' },
        { type: 'content', delta: '继续' },
      ]);
      expect(result.value).toEqual({
        text: '正文继续',
        usage: { promptTokens: 5, completionTokens: 6, totalTokens: 11 },
      });

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.stream).toBe(true);
      expect(body.stream_options).toEqual({ include_usage: true });
      expect(body).not.toHaveProperty('max_completion_tokens');
    });

    it('请求失败时抛出明确错误', async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 500, text: async () => 'server error' });
      const provider = new MimoProvider('tp-test-key');
      await expect(provider.generateTextStream('文本').next()).rejects.toThrow('MiMo 生成请求失败: 500 server error');
    });
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

  it('不支持图片/视频生成', async () => {
    const provider = new MimoProvider('tp-test-key');
    await expect(provider.generateImage()).rejects.toThrow('MiMo 不支持图片生成');
    await expect(provider.startVideoGeneration()).rejects.toThrow('MiMo 不支持视频生成');
    await expect(provider.checkVideoGenerationStatus()).rejects.toThrow('MiMo 不支持视频生成');
  });

  describe('generateTTS', () => {
    const fetchMock = vi.fn();

    beforeEach(() => {
      vi.stubGlobal('fetch', fetchMock);
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { audio: { data: Buffer.from('fake-wav').toString('base64') } } }] }),
      });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('走 /chat/completions，目标文本放在 assistant 角色消息里，默认模型/音色', async () => {
      const provider = new MimoProvider('tp-test-key');
      const result = await provider.generateTTS('你好，世界');

      expect(fetchMock.mock.calls[0][0]).toBe(`${MIMO_DEFAULT_BASE_URL}/chat/completions`);
      const request = fetchMock.mock.calls[0][1];
      expect(request.headers.Authorization).toBe('Bearer tp-test-key');
      const body = JSON.parse(request.body);
      expect(body.model).toBe(MIMO_DEFAULT_TTS_MODEL);
      expect(body.messages).toEqual([{ role: 'assistant', content: '你好，世界' }]);
      expect(body.audio).toEqual({ format: 'wav', voice: 'mimo_default' });

      expect(result.mimeType).toBe('audio/wav');
      expect(result.buffer.toString()).toBe('fake-wav');
    });

    it('无效音色回退默认音色，合法音色透传，自定义模型生效', async () => {
      const provider = new MimoProvider('tp-test-key', { tts: 'mimo-v2.5-tts-voicedesign' });

      await provider.generateTTS('文本', 'not-a-real-voice');
      expect(JSON.parse(fetchMock.mock.calls[0][1].body).audio.voice).toBe('mimo_default');
      expect(JSON.parse(fetchMock.mock.calls[0][1].body).model).toBe('mimo-v2.5-tts-voicedesign');

      await provider.generateTTS('文本', '茉莉');
      expect(JSON.parse(fetchMock.mock.calls[1][1].body).audio.voice).toBe('茉莉');
    });

    it('请求失败时抛出明确错误', async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 401, text: async () => 'unauthorized' });
      const provider = new MimoProvider('tp-test-key');
      await expect(provider.generateTTS('文本')).rejects.toThrow('MiMo TTS 请求失败: 401 unauthorized');
    });

    it('响应缺少音频数据时抛出明确错误', async () => {
      fetchMock.mockResolvedValue({ ok: true, json: async () => ({ choices: [{ message: {} }] }) });
      const provider = new MimoProvider('tp-test-key');
      await expect(provider.generateTTS('文本')).rejects.toThrow('MiMo TTS 未返回音频数据');
    });
  });
});
