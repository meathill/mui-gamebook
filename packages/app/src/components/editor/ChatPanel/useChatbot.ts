import { useState, useCallback, useRef } from 'react';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  functionCalls?: FunctionCall[];
}

export interface FunctionCall {
  name: string;
  args: Record<string, unknown>;
}

interface SSEMessage {
  type: 'text' | 'function_call' | 'done' | 'error';
  content?: string;
  name?: string;
  args?: Record<string, unknown>;
}

interface ChatContext {
  dsl: string;
  story?: string;
  characters?: Record<string, { name: string; description?: string }>;
  variables?: Record<string, unknown>;
}

interface UseChatbotProps {
  gameId: string;
  onFunctionCall: (name: string, args: Record<string, unknown>) => void;
}

export function useChatbot({ gameId, onFunctionCall }: UseChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<Message[]>([]);

  // 保持 messagesRef 与 messages 同步
  messagesRef.current = messages;

  const sendMessage = useCallback(
    async (content: string, context: ChatContext) => {
      if (!content.trim() || loading) return;

      // 取消之前的请求
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content,
      };
      // 使用 ref 获取最新的 messages
      const updatedMessages = [...messagesRef.current, userMessage];
      setMessages(updatedMessages);
      setLoading(true);
      setError(null);

      // 将历史消息转换为 API 格式（排除 functionCalls 和 id）
      const history = updatedMessages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      try {
        const response = await fetch(`/api/cms/games/${gameId}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: content, context, history }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const data = (await response.json()) as { error: string };
          throw new Error(data.error || '请求失败');
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('无法读取响应流');

        const decoder = new TextDecoder();
        let assistantContent = '';
        const functionCalls: FunctionCall[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter((line) => line.startsWith('data: '));

          for (const line of lines) {
            const jsonStr = line.slice(6); // 移除 'data: ' 前缀
            if (!jsonStr.trim()) continue;

            try {
              const data = JSON.parse(jsonStr) as SSEMessage;

              switch (data.type) {
                case 'text':
                  assistantContent += data.content || '';
                  // 实时更新消息
                  setMessages((prev) => {
                    const last = prev[prev.length - 1];
                    if (last?.role === 'assistant') {
                      return [...prev.slice(0, -1), { ...last, content: assistantContent }];
                    }
                    return [
                      ...prev,
                      {
                        id: Date.now().toString(),
                        role: 'assistant',
                        content: assistantContent,
                      },
                    ];
                  });
                  break;

                case 'function_call':
                  if (data.name && data.args) {
                    functionCalls.push({ name: data.name, args: data.args });
                    // 调用函数处理器
                    onFunctionCall(data.name, data.args);
                  }
                  break;

                case 'error':
                  setError(data.content || '未知错误');
                  break;

                case 'done':
                  // 最终更新消息，添加 function calls
                  if (functionCalls.length > 0) {
                    setMessages((prev) => {
                      const last = prev[prev.length - 1];
                      if (last?.role === 'assistant') {
                        return [...prev.slice(0, -1), { ...last, functionCalls }];
                      }
                      return prev;
                    });
                  }
                  break;
              }
            } catch (e) {
              console.error('解析 SSE 消息失败:', e, jsonStr);
            }
          }
        }

        // 如果只有 function calls 没有文本，添加一条说明消息
        if (!assistantContent && functionCalls.length > 0) {
          const callNames = functionCalls.map((fc) => fc.name).join(', ');
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              role: 'assistant',
              content: `已执行操作：${callNames}`,
              functionCalls,
            },
          ]);
        }
      } catch (e) {
        if ((e as Error).name === 'AbortError') {
          // 请求被取消，不需要处理
          return;
        }
        setError((e as Error).message);
      } finally {
        setLoading(false);
        abortControllerRef.current = null;
      }
    },
    [gameId, loading, onFunctionCall],
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setLoading(false);
    }
  }, []);

  return {
    messages,
    loading,
    error,
    sendMessage,
    clearMessages,
    cancelRequest,
  };
}
