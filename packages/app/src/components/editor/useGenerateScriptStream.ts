import { useRef, useState } from 'react';
import { getGameSessionHeaders } from '@/lib/editor/game-session';

export type GenerationPhase = 'idle' | 'thinking' | 'writing' | 'correcting';

export const PHASE_LABELS: Record<GenerationPhase, string> = {
  idle: '生成游戏脚本',
  thinking: 'AI 思考中...',
  writing: '正在编写剧本...',
  correcting: '正在修正剧本...',
};

type SSEGenerateEvent =
  | { type: 'phase'; phase: 'thinking' | 'correcting' }
  | { type: 'reasoning'; delta: string }
  | { type: 'content'; delta: string }
  | { type: 'done'; script: string }
  | { type: 'error'; content: string };

export interface GenerateScriptStreamParams {
  gameId: string;
  /** 含追问补充信息的完整故事 */
  story: string;
  provider: string;
  model?: string | null;
  existingScript?: string;
}

interface GenerateScriptStreamHandlers {
  /** 收到 done 事件、拿到完整剧本 */
  onDone: (script: string) => void;
  /** 非取消类失败（AbortError 已在 hook 内静默处理） */
  onError: (message: string) => void;
}

/**
 * 大纲 → 剧本的 SSE 流式生成：管理阶段/思考文本/字数状态与请求取消。
 * content 事件不预览正文，只累计字数：各 provider 的思考可见性本就不同，
 * 统一只展示阶段 + 字数，保证体验一致。
 */
export function useGenerateScriptStream() {
  const [phase, setPhase] = useState<GenerationPhase>('idle');
  const [reasoningText, setReasoningText] = useState('');
  const [writtenChars, setWrittenChars] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  function cancel() {
    abortRef.current?.abort();
  }

  async function generate(params: GenerateScriptStreamParams, handlers: GenerateScriptStreamHandlers) {
    setPhase('thinking');
    setReasoningText('');
    setWrittenChars(0);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`/api/cms/games/${params.gameId}/generate-script`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getGameSessionHeaders(params.gameId),
        },
        signal: controller.signal,
        body: JSON.stringify({
          story: params.story,
          provider: params.provider,
          ...(params.model ? { model: params.model } : {}),
          ...(params.existingScript ? { existingScript: params.existingScript } : {}),
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as {
          error: string;
        };
        throw new Error(data.error || '生成失败');
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('无法读取响应流');

      const decoder = new TextDecoder();
      let buffer = '';
      let script: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          let event: SSEGenerateEvent;
          try {
            event = JSON.parse(jsonStr) as SSEGenerateEvent;
          } catch (parseError) {
            console.error('解析生成流消息失败:', parseError, jsonStr);
            continue;
          }

          switch (event.type) {
            case 'phase':
              setPhase(event.phase);
              break;
            case 'reasoning':
              setReasoningText((prev) => prev + event.delta);
              break;
            case 'content':
              setPhase('writing');
              setWrittenChars((prev) => prev + event.delta.length);
              break;
            case 'done':
              script = event.script;
              break;
            case 'error':
              throw new Error(event.content);
          }
        }
      }

      if (!script) throw new Error('未能生成剧本');

      handlers.onDone(script);
    } catch (e: unknown) {
      // 用户主动取消不弹错
      if ((e as Error).name === 'AbortError') return;
      handlers.onError((e as Error).message);
    } finally {
      abortRef.current = null;
      setPhase('idle');
    }
  }

  return { phase, reasoningText, writtenChars, generate, cancel };
}
