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

    const provider = new OpencodeProvider('test-key', { text: 'deepseek-v4.1-flash' });
    const result = await provider.generateText('你好');

    expect(result.text).toBe('这是 DeepSeek 生成的内容');
    expect(result.usage).toEqual({
      promptTokens: 15,
      completionTokens: 30,
      totalTokens: 45,
    });
    expect(result.model).toBe('deepseek-v4.1-flash');
  });

  it('响应 model 优先于请求模型', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          model: 'deepseek-v4.1-flash-gateway',
          choices: [{ message: { content: 'ok' } }],
          usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const provider = new OpencodeProvider('test-key', { text: 'deepseek-v4.1-flash' });
    const result = await provider.generateText('你好');

    expect(result.model).toBe('deepseek-v4.1-flash-gateway');
  });

  it('响应没有 model 时记规整后的请求模型', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const provider = new OpencodeProvider('test-key', { text: 'mimo-v2.5' });
    const result = await provider.generateText('你好');

    expect(result.model).toBe('mimo-v2.6-flash');
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

  it('构造时注入默认 session header，并在 generateText 请求中携带', async () => {
    let capturedHeaders: Record<string, string> = {};
    vi.spyOn(globalThis, 'fetch').mockImplementation((_url, init) => {
      capturedHeaders = (init?.headers || {}) as Record<string, string>;
      return Promise.resolve(
        new Response(
          JSON.stringify({
            choices: [{ message: { content: 'test' } }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );
    });

    const provider = new OpencodeProvider('test-key');
    expect(provider.sessionId).toMatch(/^ses_/);

    await provider.generateText('hello');
    expect(capturedHeaders['x-opencode-session']).toBe(provider.sessionId);
    expect(capturedHeaders['x-session-id']).toBe(provider.sessionId);
  });

  it('显式传入 sessionId 时使用指定的 session header，并支持 options 覆盖', async () => {
    let capturedHeaders: Record<string, string> = {};
    vi.spyOn(globalThis, 'fetch').mockImplementation((_url, init) => {
      capturedHeaders = (init?.headers || {}) as Record<string, string>;
      return Promise.resolve(
        new Response(
          JSON.stringify({
            choices: [{ message: { content: 'test' } }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );
    });

    const provider = new OpencodeProvider('test-key', {}, undefined, {}, 'game_42');
    expect(provider.sessionId).toBe('game_42');

    await provider.generateText('hello');
    expect(capturedHeaders['x-opencode-session']).toBe('game_42');

    await provider.generateText('hello override', { sessionId: 'custom_override_session' });
    expect(capturedHeaders['x-opencode-session']).toBe('custom_override_session');
    expect(capturedHeaders['x-session-id']).toBe('custom_override_session');
  });

  it('自动将历史 mimo-v2.5 与 mimo-v2.5-pro 规整升级为 2.6 系列', async () => {
    let capturedBody = '';
    vi.spyOn(globalThis, 'fetch').mockImplementation((_url, init) => {
      capturedBody = init?.body as string;
      return Promise.resolve(
        new Response(
          JSON.stringify({
            choices: [{ message: { content: 'test' } }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );
    });

    const provider1 = new OpencodeProvider('test-key', { text: 'mimo-v2.5' });
    await provider1.generateText('hello');
    expect(JSON.parse(capturedBody).model).toBe('mimo-v2.6-flash');

    const provider2 = new OpencodeProvider('test-key', { text: 'mimo-v2.5-pro' });
    await provider2.generateText('hello');
    expect(JSON.parse(capturedBody).model).toBe('mimo-v2.6-pro');

    await provider1.generateText('hello', { model: 'mimo-v2.5' });
    expect(JSON.parse(capturedBody).model).toBe('mimo-v2.6-flash');
  });

  it('不支持生图、视频与 TTS，明确报错', async () => {
    const provider = new OpencodeProvider('test-key');
    await expect(provider.generateImage()).rejects.toThrow('OpenCode 不支持图片生成');
    await expect(provider.startVideoGeneration('test')).rejects.toThrow('OpenCode 不支持视频生成');
    await expect(provider.generateTTS()).rejects.toThrow('OpenCode 不支持 TTS 语音合成');
  });
});
