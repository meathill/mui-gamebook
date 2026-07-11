import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createMock, constructorSpy } = vi.hoisted(() => ({
  createMock: vi.fn(),
  constructorSpy: vi.fn(),
}));

vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create: createMock };
    constructor(options: unknown) {
      constructorSpy(options);
    }
  },
}));

import { CLAUDE_DEFAULT_TEXT_MODEL, ClaudeProvider } from '../lib/claude-provider';

describe('ClaudeProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createMock.mockResolvedValue({
      content: [{ type: 'text', text: '从前有座山' }],
      usage: { input_tokens: 100, output_tokens: 200 },
    });
  });

  it('type 为 anthropic，默认模型为 claude-sonnet-5', async () => {
    const provider = new ClaudeProvider('sk-ant-test');
    expect(provider.type).toBe('anthropic');

    await provider.generateText('写故事');
    expect(createMock.mock.calls[0][0].model).toBe(CLAUDE_DEFAULT_TEXT_MODEL);
  });

  it('默认不传 baseURL，配置后透传给 SDK（AI Gateway 场景）', () => {
    new ClaudeProvider('sk-ant-test');
    expect(constructorSpy).toHaveBeenLastCalledWith({ apiKey: 'sk-ant-test' });

    new ClaudeProvider('sk-ant-test', {}, { baseURL: 'https://gateway.ai.cloudflare.com/v1/acc/gw/anthropic' });
    expect(constructorSpy).toHaveBeenLastCalledWith({
      apiKey: 'sk-ant-test',
      baseURL: 'https://gateway.ai.cloudflare.com/v1/acc/gw/anthropic',
    });
  });

  it('generateText 不发送 temperature/top_p，usage 正确映射', async () => {
    const provider = new ClaudeProvider('sk-ant-test');
    const result = await provider.generateText('写故事');

    const request = createMock.mock.calls[0][0];
    expect(request).not.toHaveProperty('temperature');
    expect(request).not.toHaveProperty('top_p');
    expect(request.max_tokens).toBeGreaterThan(0);
    expect(request).not.toHaveProperty('thinking');

    expect(result.text).toBe('从前有座山');
    expect(result.usage).toEqual({ promptTokens: 100, completionTokens: 200, totalTokens: 300 });
  });

  it('thinking 选项映射为 adaptive thinking', async () => {
    const provider = new ClaudeProvider('sk-ant-test');
    await provider.generateText('写故事', { thinking: true });
    expect(createMock.mock.calls[0][0].thinking).toEqual({ type: 'adaptive' });
  });

  it('generateText 拼接多个 text block 并忽略其他类型', async () => {
    createMock.mockResolvedValue({
      content: [
        { type: 'thinking', thinking: '' },
        { type: 'text', text: '第一段。' },
        { type: 'text', text: '第二段。' },
      ],
      usage: { input_tokens: 1, output_tokens: 2 },
    });

    const provider = new ClaudeProvider('sk-ant-test');
    const result = await provider.generateText('写故事');
    expect(result.text).toBe('第一段。第二段。');
  });

  it('chatWithTools 映射 role/tools 并解析 tool_use block', async () => {
    createMock.mockResolvedValue({
      content: [
        { type: 'text', text: '我来添加角色' },
        { type: 'tool_use', id: 'toolu_1', name: 'addCharacter', input: { id: 'hero', name: '勇者' } },
      ],
      usage: { input_tokens: 50, output_tokens: 60 },
    });

    const provider = new ClaudeProvider('sk-ant-test');
    const result = await provider.chatWithTools(
      [
        { role: 'user', content: '系统提示' },
        { role: 'model', content: '好的' },
        { role: 'user', content: '加个角色' },
      ],
      [{ name: 'addCharacter', description: '添加角色', parameters: { type: 'object', properties: {}, required: [] } }],
    );

    const request = createMock.mock.calls[0][0];
    expect(request.messages).toEqual([
      { role: 'user', content: '系统提示' },
      { role: 'assistant', content: '好的' },
      { role: 'user', content: '加个角色' },
    ]);
    expect(request.tools).toEqual([
      {
        name: 'addCharacter',
        description: '添加角色',
        input_schema: { type: 'object', properties: {}, required: [] },
      },
    ]);

    expect(result.text).toBe('我来添加角色');
    expect(result.functionCalls).toEqual([{ name: 'addCharacter', args: { id: 'hero', name: '勇者' } }]);
  });

  it('generateMiniGame 走 system 参数并剥离代码块标记', async () => {
    createMock.mockResolvedValue({
      content: [{ type: 'text', text: '```javascript\nexport default {};\n```' }],
      usage: { input_tokens: 10, output_tokens: 20 },
    });

    const provider = new ClaudeProvider('sk-ant-test');
    const result = await provider.generateMiniGame('猜数字');

    const request = createMock.mock.calls[0][0];
    expect(typeof request.system).toBe('string');
    expect(request.system.length).toBeGreaterThan(0);
    expect(result.code).toBe('export default {};');
  });

  it('不支持图片/视频/TTS 生成', async () => {
    const provider = new ClaudeProvider('sk-ant-test');
    await expect(provider.generateImage()).rejects.toThrow('Claude 不支持图片生成');
    await expect(provider.startVideoGeneration()).rejects.toThrow('Claude 不支持视频生成');
    await expect(provider.generateTTS()).rejects.toThrow('Claude 不支持 TTS 生成');
  });
});
