import { describe, expect, it } from 'vitest';
import {
  buildChatHistory,
  MAX_CHAT_IMAGES,
  MAX_CHAT_TOOL_ROUNDS,
  type ChatToolRound,
} from '@/lib/editor/chat-declarations';

describe('chatbot 参考图', () => {
  it('上限为 4', () => {
    expect(MAX_CHAT_IMAGES).toBe(4);
  });

  it('无图时保持纯文本（兼容旧行为）', () => {
    const messages = buildChatHistory([], '上下文+请求');
    expect(messages[messages.length - 1]).toEqual({ role: 'user', content: '上下文+请求' });
  });

  it('有图时最后一条 user 消息转为多模态', () => {
    const messages = buildChatHistory([], '上下文+请求', ['https://cdn/x/1.png', 'https://cdn/x/2.png']);
    const last = messages[messages.length - 1];
    expect(last.role).toBe('user');
    expect(last.content).toEqual([
      { type: 'text', text: '上下文+请求' },
      { type: 'image_url', url: 'https://cdn/x/1.png' },
      { type: 'image_url', url: 'https://cdn/x/2.png' },
    ]);
  });

  it('历史图片保留在各自的 user 消息上', () => {
    const messages = buildChatHistory(
      [
        { role: 'user', content: '第一问', images: ['https://cdn/x/1.png'] },
        { role: 'assistant', content: '好的' },
        { role: 'user', content: '第二问' },
      ],
      '上下文+第二问',
      ['https://cdn/x/2.png'],
    );
    // [system, model, 第一问(带图), 好的, 第二问(带上下文+本次图)]
    expect(messages[2].content).toEqual([
      { type: 'text', text: '第一问' },
      { type: 'image_url', url: 'https://cdn/x/1.png' },
    ]);
    expect(messages[3]).toEqual({ role: 'model', content: '好的' });
    expect(messages[4].content).toEqual([
      { type: 'text', text: '上下文+第二问' },
      { type: 'image_url', url: 'https://cdn/x/2.png' },
    ]);
  });
});

describe('chatbot 多轮工具历史', () => {
  const round: ChatToolRound = {
    assistantText: '我先看看场景',
    calls: [{ id: 'call_1', name: 'getScene', args: { sceneId: 'start' } }],
    results: [
      {
        id: 'call_1',
        name: 'getScene',
        content: '{"ok":true,"sceneId":"start"}',
      },
    ],
  };

  it('轮次上限为 4', () => {
    expect(MAX_CHAT_TOOL_ROUNDS).toBe(4);
  });

  it('追加 assistant toolCalls 与 tool result，并保留 call id', () => {
    const messages = buildChatHistory([{ role: 'user', content: '改一下' }], '上下文+改一下', undefined, [round]);

    expect(messages[messages.length - 2]).toEqual({
      role: 'model',
      content: '我先看看场景',
      toolCalls: [{ id: 'call_1', name: 'getScene', args: { sceneId: 'start' } }],
    });
    expect(messages[messages.length - 1]).toEqual({
      role: 'tool',
      content: '{"ok":true,"sceneId":"start"}',
      toolCallId: 'call_1',
      name: 'getScene',
    });
  });

  it('失败结果带 isError，signature 原样透传', () => {
    const messages = buildChatHistory([], '请求', undefined, [
      {
        assistantText: '',
        calls: [{ id: 'c2', name: 'getScene', args: { sceneId: 'x' }, signature: 'sig' }],
        results: [{ id: 'c2', name: 'getScene', content: '{"ok":false}', isError: true }],
      },
    ]);

    expect(messages[messages.length - 2].toolCalls?.[0]).toMatchObject({ id: 'c2', signature: 'sig' });
    expect(messages[messages.length - 1]).toMatchObject({ role: 'tool', isError: true });
  });

  it('没有工具轮次时行为不变', () => {
    const withRounds = buildChatHistory([], '请求', undefined, []);
    const withoutRounds = buildChatHistory([], '请求');
    expect(withRounds).toEqual(withoutRounds);
  });
});
