import { describe, expect, it } from 'vitest';
import { buildChatHistory, MAX_CHAT_IMAGES } from '@/lib/editor/chat-declarations';

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
