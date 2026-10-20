/** chatbot 单轮 HTTP/SSE 读取与工具结果序列化 */
import { getGameSessionHeaders } from '@/lib/editor/game-session';
import type { ChatToolRound } from '@/lib/editor/chat-declarations';
import type { ChatContext, FunctionCall, ToolExecutionResult } from './chat-types';

interface SSEMessage {
  type: 'text' | 'function_call' | 'done' | 'error';
  content?: string;
  id?: string;
  name?: string;
  args?: Record<string, unknown>;
  signature?: string;
}

export interface ChatResponse {
  text: string;
  calls: FunctionCall[];
  error?: string;
}

export function createId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function serializeToolResult(result: ToolExecutionResult): string {
  const base: Record<string, unknown> = { ok: result.ok, name: result.name };
  if (result.warnings && result.warnings.length > 0) base.warnings = result.warnings;
  try {
    const parsed = JSON.parse(result.message) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return JSON.stringify({ ...base, ...(parsed as Record<string, unknown>) });
    }
  } catch {
    // 普通文本结果，继续走下面的包装
  }
  return JSON.stringify({ ...base, message: result.message });
}

interface RequestChatParams {
  gameId: string;
  message: string;
  context: ChatContext;
  history: Array<{ role: 'user' | 'assistant'; content: string; images?: string[] }>;
  toolRounds: ChatToolRound[];
  provider?: string;
  model?: string | null;
  images?: string[];
  signal: AbortSignal;
}

/** 读取一轮 SSE；返回文本、工具调用和错误 */
export async function requestChat(params: RequestChatParams): Promise<ChatResponse> {
  const response = await fetch(`/api/cms/games/${params.gameId}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getGameSessionHeaders(params.gameId),
    },
    body: JSON.stringify({
      message: params.message,
      context: params.context,
      history: params.history,
      toolRounds: params.toolRounds,
      provider: params.provider,
      ...(params.model ? { model: params.model } : {}),
      ...(params.images && params.images.length > 0 ? { images: params.images } : {}),
    }),
    signal: params.signal,
  });

  if (!response.ok) {
    const data = (await response.json()) as { error?: string };
    throw new Error(data.error || '请求失败');
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('无法读取响应流');

  const decoder = new TextDecoder();
  let buffer = '';
  let text = '';
  const calls: FunctionCall[] = [];
  let streamError: string | undefined;

  const handleLine = (line: string) => {
    if (!line.startsWith('data: ')) return;
    const json = line.slice(6).trim();
    if (!json) return;
    let data: SSEMessage;
    try {
      data = JSON.parse(json) as SSEMessage;
    } catch (parseError) {
      console.error('解析 SSE 消息失败:', parseError, json);
      return;
    }
    if (data.type === 'text') {
      text += data.content || '';
    } else if (data.type === 'function_call') {
      if (data.name && data.args) {
        calls.push({
          id: data.id || `call_${calls.length}_${data.name}`,
          name: data.name,
          args: data.args,
          ...(data.signature ? { signature: data.signature } : {}),
        });
      }
    } else if (data.type === 'error') {
      streamError = data.content || '未知错误';
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) handleLine(line);
  }
  buffer += decoder.decode();
  for (const line of buffer.split('\n')) handleLine(line);

  return { text, calls, ...(streamError ? { error: streamError } : {}) };
}
