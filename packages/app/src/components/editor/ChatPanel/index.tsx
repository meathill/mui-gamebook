'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, SendIcon, Loader2Icon, Trash2Icon, BotIcon, SquareIcon } from 'lucide-react';
import { useChatbot, Message } from './useChatbot';
import { Button } from '@radix-ui/themes';

interface ChatPanelProps {
  gameId: string;
  isOpen: boolean;
  onClose: () => void;
  dsl: string;
  story?: string;
  characters?: Record<string, { name: string; description?: string }>;
  variables?: Record<string, unknown>;
  onFunctionCall: (name: string, args: Record<string, unknown>) => void;
}

export default function ChatPanel({
  gameId,
  isOpen,
  onClose,
  dsl,
  story,
  characters,
  variables,
  onFunctionCall,
}: ChatPanelProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { messages, loading, error, sendMessage, clearMessages, cancelRequest } = useChatbot({
    gameId,
    onFunctionCall,
  });

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 打开时聚焦输入框
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!input.trim() || loading) return;

      sendMessage(input.trim(), { dsl, story, characters, variables });
      setInput('');
    },
    [input, loading, sendMessage, dsl, story, characters, variables],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  if (!isOpen) return null;

  return (
    <div className="w-80 shrink-0 flex flex-col bg-white border-l border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
        <div className="flex items-center gap-2">
          <BotIcon className="size-5" />
          <span className="font-semibold">AI 编辑助手</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={clearMessages}
            className="p-1.5 hover:bg-white/20 rounded-md transition-colors"
            title="清空对话">
            <Trash2Icon className="size-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-md transition-colors"
            title="关闭">
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* Messages - 使用 min-h-0 确保 flex 子元素可滚动 */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <BotIcon className="size-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">你好！我可以帮助你编辑剧本。</p>
            <p className="text-xs mt-1">试着告诉我："把第一个场景的描述改一下"</p>
          </div>
        )}

        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
          />
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Loader2Icon className="size-4 animate-spin" />
            <span>AI 正在思考...</span>
          </div>
        )}

        {error && <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{error}</div>}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-gray-200 p-4">
        <div className="mb-1">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入你的请求..."
            rows={2}
            className="w-full block resize-none rounded-lg border border-gray-300 px-2 py-1 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
          />
        </div>
        <footer className="flex items-start justify-between">
          <p className="text-xs text-gray-400 mt-2">按 Enter 发送，Shift + Enter 换行</p>
          {loading ? (
            <Button
              type="button"
              onClick={cancelRequest}
              size="1"
              variant="solid"
              color="red">
              <SquareIcon className="size-3" />
            </Button>
          ) : (
            <Button
              disabled={!input.trim()}
              size="1"
              variant="solid">
              <SendIcon className="size-3" />
            </Button>
          )}
        </footer>
      </form>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 ${
          isUser ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-800'
        }`}>
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>

        {message.functionCalls && message.functionCalls.length > 0 && (
          <div className="mt-2 pt-2 border-t border-white/20">
            {message.functionCalls.map((fc, i) => (
              <div
                key={i}
                className="text-xs opacity-80 flex items-center gap-1">
                <span className="font-mono">✓ {fc.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
