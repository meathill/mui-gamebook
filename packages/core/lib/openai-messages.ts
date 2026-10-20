/** OpenAI Chat Completions 消息格式转换（含多轮 tool 消息） */
import type OpenAI from 'openai';
import { type ChatMessage, getMessageText } from './ai-provider';

export function toOpenAiMessages(messages: ChatMessage[]): OpenAI.Chat.ChatCompletionMessageParam[] {
  const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
  for (const msg of messages) {
    if (msg.role === 'tool') {
      openaiMessages.push({
        role: 'tool',
        tool_call_id: msg.toolCallId ?? '',
        content: typeof msg.content === 'string' ? msg.content : getMessageText(msg.content),
      });
      continue;
    }

    if (msg.role === 'model') {
      const content = typeof msg.content === 'string' ? msg.content : getMessageText(msg.content);
      if (msg.toolCalls && msg.toolCalls.length > 0) {
        openaiMessages.push({
          role: 'assistant',
          content,
          tool_calls: msg.toolCalls.map((call) => ({
            id: call.id,
            type: 'function' as const,
            function: { name: call.name, arguments: JSON.stringify(call.args) },
          })),
        });
      } else {
        openaiMessages.push({ role: 'assistant', content });
      }
      continue;
    }

    if (typeof msg.content === 'string') {
      openaiMessages.push({ role: 'user', content: msg.content });
      continue;
    }
    openaiMessages.push({
      role: 'user',
      content: msg.content
        .filter((part) => (part.type === 'text' && part.text) || (part.type === 'image_url' && part.url))
        .map((part) =>
          part.type === 'image_url'
            ? { type: 'image_url' as const, image_url: { url: part.url as string } }
            : { type: 'text' as const, text: part.text as string },
        ),
    });
  }
  return openaiMessages;
}
