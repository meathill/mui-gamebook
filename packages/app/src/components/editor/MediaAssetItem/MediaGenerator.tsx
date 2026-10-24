import { SpinnerIcon, SparkleIcon, CheckIcon } from '@phosphor-icons/react/dist/ssr';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect } from '@/components/ui/native-select';
import type { MediaGeneratorProps } from './types';
import MentionInput from '../MentionInput';

export default function MediaGenerator({
  prompt,
  aspectRatio,
  isImage,
  isGenerating,
  aspectRatios,
  characters,
  onPromptChange,
  onAspectRatioChange,
  onGenerate,
  variant = 'compact',
}: MediaGeneratorProps) {
  const isFeatured = variant === 'featured';
  const hasCharacters = characters && Object.keys(characters).length > 0;

  if (isFeatured) {
    return (
      <div className="mt-3 p-3 bg-purple-50 rounded-md border border-purple-100">
        {hasCharacters ? (
          <MentionInput
            value={prompt}
            onChange={onPromptChange}
            characters={characters}
            placeholder="描述你想要的内容... 使用 @ 引用角色"
            className="mb-2"
          />
        ) : (
          <Textarea
            placeholder="描述你想要的内容..."
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            className="w-full p-2 mb-2 h-20 resize-none"
          />
        )}
        {isImage && (
          <div className="flex gap-2 mb-2">
            <label className="text-xs text-gray-600 self-center">比例:</label>
            <NativeSelect
              value={aspectRatio}
              onChange={(e) => onAspectRatioChange(e.target.value)}
              wrapperClassName="flex-1"
              className="p-1.5 text-xs">
              {aspectRatios.map((r) => (
                <option
                  key={r.value}
                  value={r.value}>
                  {r.label}
                </option>
              ))}
            </NativeSelect>
          </div>
        )}
        <Button
          variant="violet"
          onClick={onGenerate}
          disabled={isGenerating || !prompt}>
          {isGenerating ? (
            <SpinnerIcon
              size={12}
              className="animate-spin"
            />
          ) : (
            <SparkleIcon size={12} />
          )}
          生成
        </Button>
      </div>
    );
  }

  // Compact 模式
  return (
    <div className="mb-2">
      {hasCharacters ? (
        <MentionInput
          value={prompt}
          onChange={onPromptChange}
          characters={characters}
          placeholder="输入 AI 生成提示词... 使用 @ 引用角色"
        />
      ) : (
        <Textarea
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          className="w-full p-2 text-xs resize-none h-16"
          placeholder="输入 AI 生成提示词..."
        />
      )}
      <footer className="flex items-center gap-2 mt-2">
        {isImage && (
          <div className="flex items-center gap-2 flex-1">
            <label className="text-xs text-gray-500">比例:</label>
            <NativeSelect
              value={aspectRatio}
              onChange={(e) => onAspectRatioChange(e.target.value)}
              wrapperClassName="flex-1"
              className="text-xs p-1">
              {aspectRatios.map((r) => (
                <option
                  key={r.value}
                  value={r.value}>
                  {r.label}
                </option>
              ))}
            </NativeSelect>
          </div>
        )}
        <Button
          variant="violet"
          size="icon-sm"
          disabled={isGenerating || !prompt}
          onClick={onGenerate}
          title="生成素材">
          {isGenerating ? (
            <SpinnerIcon
              size={16}
              className="animate-spin"
            />
          ) : (
            <CheckIcon size={16} />
          )}
        </Button>
      </footer>
    </div>
  );
}
