import { useCallback, useRef, useState } from 'react';
import type { EditorToolBatchResult } from '@/lib/editor/chatFunctionHandlers';
import { MAX_CHAT_TOOL_ROUNDS, MAX_TOOL_CALLS_PER_ROUND, type ChatToolRound } from '@/lib/editor/chat-declarations';
import type { ChatContext, ChatStatus, FunctionCall, Message, ToolExecutionResult } from './chat-types';
import { createId, requestChat, serializeToolResult } from './chat-stream';

export type { ChatStatus, FunctionCall, Message, ToolExecutionResult } from './chat-types';

type OnFunctionCall = (
  calls: FunctionCall[],
  baseDocument?: EditorToolBatchResult['document'],
) => Promise<EditorToolBatchResult> | EditorToolBatchResult;

interface UseChatbotProps {
  gameId: string;
  onFunctionCall: OnFunctionCall;
}

export function useChatbot({ gameId, onFunctionCall }: UseChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<ChatStatus>(null);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<Message[]>([]);
  const onFunctionCallRef = useRef(onFunctionCall);
  onFunctionCallRef.current = onFunctionCall;

  const appendMessage = useCallback((message: Message) => {
    messagesRef.current = [...messagesRef.current, message];
    setMessages(messagesRef.current);
  }, []);

  const updateMessage = useCallback((id: string, patch: Partial<Message>) => {
    messagesRef.current = messagesRef.current.map((message) =>
      message.id === id ? { ...message, ...patch } : message,
    );
    setMessages(messagesRef.current);
  }, []);

  const sendMessage = useCallback(
    async (content: string, context: ChatContext, provider?: string, images?: string[], model?: string | null) => {
      if (!content.trim() && (!images || images.length === 0)) return;
      if (loading) return;

      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      appendMessage({
        id: createId(),
        role: 'user',
        content,
        kind: 'text',
        ...(images && images.length > 0 ? { images } : {}),
      });
      setLoading(true);
      setStatus('thinking');
      setError(null);

      // history 只包含用户/assistant 的正文，不包含中间工具轮
      const history = messagesRef.current
        .filter((message) => message.kind !== 'tool-round')
        .map((message) => ({
          role: message.role,
          content: message.content,
          ...(message.images && message.images.length > 0 ? { images: message.images } : {}),
        }));

      let activeContext: ChatContext = { ...context };
      const toolRounds: ChatToolRound[] = [];
      let lastDocument: EditorToolBatchResult['document'] | undefined;

      try {
        for (let round = 0; round <= MAX_CHAT_TOOL_ROUNDS; round++) {
          if (controller.signal.aborted) return;

          setStatus('thinking');
          const response = await requestChat({
            gameId,
            message: content,
            context: activeContext,
            history,
            toolRounds,
            provider,
            model,
            images,
            signal: controller.signal,
          });

          if (response.error) {
            setError(response.error);
            return;
          }

          const calls = response.calls;
          if (calls.length === 0) {
            if (response.text) {
              appendMessage({
                id: createId(),
                role: 'assistant',
                content: response.text,
                kind: 'text',
              });
            } else if (round === 0) {
              setError('无法获取 AI 响应');
            }
            return;
          }

          // 达到工具轮次上限：不再执行，保留已完成的修改并提示用户
          if (toolRounds.length >= MAX_CHAT_TOOL_ROUNDS) {
            setError(`工具调用轮次已达上限（${MAX_CHAT_TOOL_ROUNDS}），已停止执行。请缩小修改范围后重试。`);
            return;
          }

          const roundMessageId = createId();
          appendMessage({
            id: roundMessageId,
            role: 'assistant',
            content: response.text,
            functionCalls: calls,
            kind: 'tool-round',
          });

          setStatus('executing');
          const executable = calls.slice(0, MAX_TOOL_CALLS_PER_ROUND);
          let execution: EditorToolBatchResult;
          try {
            execution = await onFunctionCallRef.current(executable, lastDocument);
          } catch (executionError) {
            const message = `工具执行异常：${(executionError as Error).message}`;
            execution = {
              ok: false,
              changed: false,
              dsl: activeContext.dsl,
              results: executable.map((call) => ({
                id: call.id,
                name: call.name,
                ok: false,
                message,
              })),
              error: message,
            };
          }

          // 基础状态无法构建（剧本解析失败/游戏未加载）时，重试没有意义，直接停止
          if (!execution.document && execution.error) {
            updateMessage(roundMessageId, {
              toolResults: calls.map((call) => ({
                name: call.name,
                ok: false,
                message: execution.error as string,
              })),
            });
            setError(execution.error);
            return;
          }

          const resultById = new Map(
            execution.results.filter((result) => result.id).map((result) => [result.id as string, result]),
          );
          const results = calls.map((call, index) => {
            if (index >= executable.length) {
              return {
                id: call.id,
                name: call.name,
                content: JSON.stringify({
                  ok: false,
                  name: call.name,
                  message: `单轮工具调用超过上限 ${MAX_TOOL_CALLS_PER_ROUND}，本条未执行`,
                }),
                isError: true,
              };
            }
            const result = resultById.get(call.id) ?? execution.results[index];
            const normalized: ToolExecutionResult = result
              ? {
                  name: result.name,
                  ok: result.ok,
                  message: result.message,
                  ...(result.warnings ? { warnings: result.warnings } : {}),
                }
              : {
                  name: call.name,
                  ok: false,
                  message: '工具未返回结果',
                };
            return {
              id: call.id,
              name: normalized.name,
              content: serializeToolResult(normalized),
              isError: !normalized.ok,
            };
          });

          toolRounds.push({ assistantText: response.text, calls, results });
          updateMessage(roundMessageId, {
            toolResults: results.map((result) => ({
              name: result.name,
              ok: !result.isError,
              message: result.content,
            })),
          });

          if (execution.document) lastDocument = execution.document;
          activeContext = {
            ...activeContext,
            dsl: execution.dsl || activeContext.dsl,
            ...(execution.document
              ? {
                  characters: execution.document.game.ai.characters,
                  variables: execution.document.game.initialState as Record<string, unknown>,
                }
              : {}),
          };
        }
      } catch (requestError) {
        if ((requestError as Error).name === 'AbortError') return;
        setError((requestError as Error).message);
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
          setLoading(false);
          setStatus(null);
        }
      }
    },
    [appendMessage, gameId, loading, updateMessage],
  );

  const clearMessages = useCallback(() => {
    messagesRef.current = [];
    setMessages([]);
    setError(null);
  }, []);

  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setLoading(false);
      setStatus(null);
    }
  }, []);

  return {
    messages,
    loading,
    status,
    error,
    sendMessage,
    clearMessages,
    cancelRequest,
  };
}
