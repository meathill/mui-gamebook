'use client';

import {
  ImageIcon,
  PaperPlaneRightIcon,
  RobotIcon,
  SpinnerIcon,
  SquareIcon,
  TrashIcon,
  XIcon,
} from '@phosphor-icons/react';
import Button from '@/components/Button';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AI_PROVIDER_LABELS, useAiPermissions } from '@/lib/editor/useAiPermissions';
import { MAX_CHAT_IMAGES } from '@/lib/editor/chat-declarations';
import { isImeComposing } from '@/lib/keyboard';
import { FunctionCall, Message, useChatbot } from './useChatbot';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

interface ChatPanelProps {
  gameId: string;
  isOpen: boolean;
  onClose: () => void;
  dsl: string;
  story?: string;
  characters?: Record<string, { name: string; description?: string }>;
  variables?: Record<string, unknown>;
  onFunctionCall: (calls: FunctionCall[]) => void;
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 待发送的参考图（已上传到 R2 的 URL，≤MAX_CHAT_IMAGES）
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // 用户被授权多个 AI 时可切换，默认第一项（用户默认提供者）
  const { providers } = useAiPermissions();
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const activeProvider = selectedProvider || providers[0];

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
      if ((!input.trim() && pendingImages.length === 0) || loading || uploading) return;

      sendMessage(input.trim(), { dsl, story, characters, variables }, activeProvider, pendingImages);
      setInput('');
      setPendingImages([]);
    },
    [input, loading, uploading, pendingImages, sendMessage, dsl, story, characters, variables, activeProvider],
  );

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const slots = MAX_CHAT_IMAGES - pendingImages.length;
      if (slots <= 0) {
        setUploadError(`最多支持 ${MAX_CHAT_IMAGES} 张参考图`);
        return;
      }
      const picked = Array.from(files).slice(0, slots);
      const oversized = picked.find((f) => f.size > MAX_IMAGE_SIZE);
      if (oversized) {
        setUploadError(`图片 ${oversized.name} 超过 5MB 上限`);
        return;
      }
      const nonImage = picked.find((f) => !f.type.startsWith('image/'));
      if (nonImage) {
        setUploadError(`文件 ${nonImage.name} 不是图片`);
        return;
      }
      setUploading(true);
      setUploadError(null);
      try {
        const urls: string[] = [];
        for (const file of picked) {
          const form = new FormData();
          form.append('file', file);
          form.append('type', 'chat');
          const res = await fetch(`/api/cms/games/${gameId}/upload`, { method: 'POST', body: form });
          if (!res.ok) throw new Error('上传失败');
          const data = (await res.json()) as { url?: string; error?: string };
          if (!data.url) throw new Error(data.error || '上传失败');
          urls.push(data.url);
        }
        setPendingImages((prev) => [...prev, ...urls].slice(0, MAX_CHAT_IMAGES));
      } catch (e) {
        setUploadError((e as Error).message);
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [gameId, pendingImages.length],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (isImeComposing(e)) return;

      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  if (!isOpen) return null;

  return (
    <div className="w-80 h-[calc(100dvh-7rem-2px)] max-h-[calc(100dvh-7rem-2px)] sticky top-28 shrink-0 flex flex-col bg-white border-l border-gray-200">
      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <RobotIcon className="size-12 mx-auto mb-3 opacity-50" />
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
            <SpinnerIcon className="size-4 animate-spin" />
            <span>AI 正在思考...</span>
          </div>
        )}

        {error && <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{error}</div>}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-gray-200 p-3">
        {pendingImages.length > 0 && (
          <div className="flex gap-2 mb-2 flex-wrap">
            {pendingImages.map((url) => (
              <div
                key={url}
                className="relative size-14 rounded-md overflow-hidden border border-gray-200">
                <img
                  src={url}
                  alt="参考图"
                  className="size-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setPendingImages((prev) => prev.filter((u) => u !== url))}
                  className="absolute top-0.5 right-0.5 p-0.5 bg-black/50 text-white rounded-full hover:bg-black/70"
                  title="移除">
                  <XIcon className="size-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        {uploadError && <p className="text-xs text-red-500 mb-1.5">{uploadError}</p>}
        <div className="relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入你的请求..."
            rows={2}
            className="w-full block resize-none rounded-lg border border-gray-300 px-3 py-2 pr-9 text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none"
          />
          {messages.length > 0 && (
            <button
              type="button"
              onClick={clearMessages}
              className="absolute top-1.5 right-1.5 p-1 text-gray-300 hover:text-red-400 rounded transition-colors"
              title="清空对话">
              <TrashIcon className="size-3.5" />
            </button>
          )}
        </div>
        <footer className="flex items-center justify-between mt-1.5 gap-2">
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => void handleFiles(e.target.files)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || pendingImages.length >= MAX_CHAT_IMAGES}
              className="p-1.5 text-gray-400 hover:text-purple-600 rounded transition-colors disabled:opacity-40"
              title={`添加参考图（最多 ${MAX_CHAT_IMAGES} 张）`}>
              {uploading ? <SpinnerIcon className="size-4 animate-spin" /> : <ImageIcon className="size-4" />}
            </button>
            {pendingImages.length > 0 && (
              <span className="text-xs text-gray-400">
                {pendingImages.length}/{MAX_CHAT_IMAGES}
              </span>
            )}
            {providers.length > 1 ? (
              <select
                value={activeProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className="text-xs text-gray-500 border border-gray-200 rounded px-1 py-0.5 outline-none focus:border-orange-400"
                title="选择 AI 提供者">
                {providers.map((provider) => (
                  <option
                    key={provider}
                    value={provider}>
                    {AI_PROVIDER_LABELS[provider]}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-xs text-gray-400">Enter 发送，Shift+Enter 换行</p>
            )}
          </div>
          {loading ? (
            <Button
              onClick={cancelRequest}
              size="sm"
              color="red">
              <SquareIcon className="size-3" />
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={!input.trim() && pendingImages.length === 0}
              size="sm"
              color="orange">
              <PaperPlaneRightIcon className="size-3" />
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
        className={`max-w-[85%] rounded-lg px-3 py-2 max-h-[50dvh] overflow-auto ${
          isUser ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-800'
        }`}>
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        {message.images && message.images.length > 0 && (
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {message.images.map((url) => (
              <img
                key={url}
                src={url}
                alt="参考图"
                className="size-16 rounded-md object-cover border border-white/20"
              />
            ))}
          </div>
        )}

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
