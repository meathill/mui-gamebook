/** Google GenAI 消息格式转换（含多轮 functionCall/functionResponse） */
import type { Part } from '@google/genai';
import { type ChatMessage, getMessageText } from './ai-provider';

export async function toGoogleContents(messages: ChatMessage[]): Promise<Array<{ role: string; parts: Part[] }>> {
  const contents: Array<{ role: string; parts: Part[] }> = [];
  let pendingToolResponses: Part[] = [];
  const flushToolResponses = () => {
    if (pendingToolResponses.length === 0) return;
    contents.push({ role: 'user', parts: pendingToolResponses });
    pendingToolResponses = [];
  };

  for (const msg of messages) {
    if (msg.role === 'tool') {
      const result = typeof msg.content === 'string' ? msg.content : getMessageText(msg.content);
      pendingToolResponses.push({
        functionResponse: {
          ...(msg.toolCallId ? { id: msg.toolCallId } : {}),
          ...(msg.name ? { name: msg.name } : {}),
          response: msg.isError ? { error: result } : { output: result },
        },
      });
      continue;
    }
    flushToolResponses();

    const parts: Part[] = [];
    if (msg.role === 'model') {
      const text = typeof msg.content === 'string' ? msg.content : getMessageText(msg.content);
      if (text) parts.push({ text });
      for (const call of msg.toolCalls ?? []) {
        parts.push({
          functionCall: { id: call.id, name: call.name, args: call.args },
          ...(call.signature ? { thoughtSignature: call.signature } : {}),
        });
      }
    } else if (typeof msg.content === 'string') {
      parts.push({ text: msg.content });
    } else {
      for (const part of msg.content) {
        if (part.type === 'text' && part.text) {
          parts.push({ text: part.text });
        } else if (part.type === 'image_url' && part.url) {
          try {
            const imgRes = await fetch(part.url);
            if (!imgRes.ok) {
              console.warn(`[Google AI] Failed to fetch chat image: ${part.url}`);
              continue;
            }
            const buf = await imgRes.arrayBuffer();
            parts.push({
              inlineData: {
                mimeType: imgRes.headers.get('content-type') || 'image/png',
                data: Buffer.from(buf).toString('base64'),
              },
            });
          } catch (e) {
            console.warn(`[Google AI] Failed to process chat image: ${part.url}`, e);
          }
        }
      }
    }
    contents.push({ role: msg.role === 'model' ? 'model' : 'user', parts });
  }
  flushToolResponses();
  return contents;
}
