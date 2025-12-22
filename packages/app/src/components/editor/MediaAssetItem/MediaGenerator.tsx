import { Loader2, Sparkles, CheckIcon } from 'lucide-react';
import type { MediaGeneratorProps } from './types';

export default function MediaGenerator({
  prompt,
  aspectRatio,
  isImage,
  isGenerating,
  aspectRatios,
  onPromptChange,
  onAspectRatioChange,
  onGenerate,
  variant = 'compact',
}: MediaGeneratorProps) {
  const isFeatured = variant === 'featured';

  if (isFeatured) {
    return (
      <div className="mt-3 p-3 bg-purple-50 rounded-md border border-purple-100">
        <textarea
          placeholder="描述你想要的内容..."
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          className="w-full p-2 text-sm border rounded mb-2 h-20 resize-none"
        />
        {isImage && (
          <div className="flex gap-2 mb-2">
            <label className="text-xs text-gray-600 self-center">比例:</label>
            <select
              value={aspectRatio}
              onChange={(e) => onAspectRatioChange(e.target.value)}
              className="flex-1 p-1.5 text-xs border rounded">
              {aspectRatios.map((r) => (
                <option
                  key={r.value}
                  value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        )}
        <button
          onClick={onGenerate}
          disabled={isGenerating || !prompt}
          className="w-full py-1.5 bg-purple-600 text-white rounded text-xs font-medium hover:bg-purple-700 disabled:opacity-50 flex justify-center items-center gap-2">
          {isGenerating ? (
            <Loader2
              size={12}
              className="animate-spin"
            />
          ) : (
            <Sparkles size={12} />
          )}
          生成
        </button>
      </div>
    );
  }

  // Compact 模式
  return (
    <div className="mb-2">
      <textarea
        value={prompt}
        onChange={(e) => onPromptChange(e.target.value)}
        className="w-full p-2 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-purple-500 resize-none h-16"
        placeholder="输入 AI 生成提示词..."
      />
      <footer className="flex items-center gap-2">
        {isImage && (
          <div className="flex items-center gap-2 flex-1">
            <label className="text-xs text-gray-500">比例:</label>
            <select
              value={aspectRatio}
              onChange={(e) => onAspectRatioChange(e.target.value)}
              className="flex-1 text-xs p-1 border border-gray-300 rounded">
              {aspectRatios.map((r) => (
                <option
                  key={r.value}
                  value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        )}
        <button
          className="size-6 bg-purple-600 text-white hover:bg-purple-500 rounded flex items-center justify-center p-1 ms-auto"
          disabled={isGenerating || !prompt}
          onClick={onGenerate}
          title="生成素材"
          type="button">
          {isGenerating ? (
            <Loader2
              size={16}
              className="animate-spin"
            />
          ) : (
            <CheckIcon size={16} />
          )}
        </button>
      </footer>
    </div>
  );
}
