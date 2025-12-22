'use client';

import { CheckIcon, Trash2, ImageIcon, Loader2, Upload, Sparkles, Clock, Gamepad2, List } from 'lucide-react';
import type { SceneNode } from '@mui-gamebook/parser';
import MiniGameSelector from './MiniGameSelector';
import { useCmsConfig, getAspectRatios } from '@/hooks/useCmsConfig';

export interface AssetItemProps {
  index: number;
  asset: SceneNode;
  generatingIndex: number;
  uploadingIndex: number;
  openGeneratorIndex: number;
  showMinigameSelector: number;
  onAssetChange: (index: number, field: string, value: string) => void;
  onAssetDelete: (index: number) => void;
  onRegenerate: (index: number, asset: SceneNode) => void;
  onTriggerUpload: (index: number, accept: string) => void;
  onToggleGenerator: (index: number) => void;
  onToggleMinigameSelector: (index: number) => void;
}

export default function AssetItem({
  index,
  asset,
  generatingIndex,
  uploadingIndex,
  openGeneratorIndex,
  showMinigameSelector,
  onAssetChange,
  onAssetDelete,
  onRegenerate,
  onTriggerUpload,
  onToggleGenerator,
  onToggleMinigameSelector,
}: AssetItemProps) {
  const assetUrl = 'url' in asset ? asset.url : undefined;
  const assetPrompt = 'prompt' in asset ? asset.prompt : undefined;
  const isImage = asset.type.includes('image');
  const isAudio = asset.type.includes('audio');
  const isVideo = asset.type.includes('video');
  const isMinigame = asset.type === 'minigame';
  const { data: cmsConfig } = useCmsConfig();
  const aspectRatios = getAspectRatios(cmsConfig?.defaultAiProvider);

  return (
    <div className="p-3 bg-gray-50 rounded border border-gray-200 text-sm relative group">
      <div className="flex items-center gap-1 mb-2">
        {isImage && (
          <ImageIcon
            size={16}
            className="text-gray-500"
          />
        )}
        {isMinigame && (
          <Gamepad2
            size={16}
            className="text-purple-500"
          />
        )}
        <span className="font-bold uppercase text-xs">{asset.type.replace('ai_', '').replace('static_', '')}</span>
        <div className="flex gap-1 ms-auto">
          {isMinigame && (
            <button
              onClick={() => onToggleMinigameSelector(index)}
              className="p-1 text-xs text-blue-600 rounded hover:bg-blue-100"
              title="选择已有小游戏"
              type="button">
              <List size={14} />
            </button>
          )}
          {!isMinigame && (
            <button
              onClick={() => onTriggerUpload(index, isImage ? 'image/*' : isAudio ? 'audio/*' : 'video/*')}
              disabled={uploadingIndex === index}
              className="p-1 text-xs rounded disabled:text-gray-300 hover:bg-blue-100"
              title="上传素材"
              type="button">
              {uploadingIndex === index ? (
                <Loader2
                  size={14}
                  className="animate-spin"
                />
              ) : (
                <Upload size={14} />
              )}
            </button>
          )}
          <button
            className="p-1 text-xs text-purple-600 rounded hover:bg-purple-100 disabled:text-purple-300"
            disabled={generatingIndex > -1}
            onClick={() => onToggleGenerator(index)}
            title="AI 生成素材"
            type="button">
            <Sparkles size={14} />
          </button>
          <button
            onClick={() => onAssetDelete(index)}
            className="p-1 text-red-600 hover:text-red-500 hover:bg-red-100"
            title="删除素材">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {isMinigame && showMinigameSelector === index && (
        <div className="mb-2">
          <MiniGameSelector
            onSelect={(mg) => {
              onAssetChange(index, 'url', `/api/cms/minigames/${mg.id}`);
              onToggleMinigameSelector(-1);
            }}
            onGenerate={() => {
              onToggleMinigameSelector(-1);
              onToggleGenerator(index);
            }}
            isGenerating={generatingIndex === index}
          />
        </div>
      )}

      {(openGeneratorIndex === index || (!assetUrl && assetPrompt)) && (
        <div className="mb-2">
          <textarea
            value={assetPrompt || ''}
            onChange={(e) => onAssetChange(index, 'prompt', e.target.value)}
            className="w-full p-2 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-purple-500 resize-none h-16"
            placeholder="输入 AI 生成提示词..."
          />
          <footer className="flex items-center gap-2">
            {isImage && asset.type === 'ai_image' && (
              <div className="flex items-center gap-2 flex-1">
                <label className="text-xs text-gray-500">比例:</label>
                <select
                  value={'aspectRatio' in asset ? asset.aspectRatio || '1:1' : '1:1'}
                  onChange={(e) => onAssetChange(index, 'aspectRatio', e.target.value)}
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
              disabled={generatingIndex === index || !assetPrompt}
              onClick={() => onRegenerate(index, asset)}
              title="生成素材"
              type="button">
              {generatingIndex === index ? (
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
      )}

      {assetUrl && isImage && !assetUrl.startsWith('pending://') && (
        <div className="mb-2 relative w-full h-24 bg-gray-100 rounded overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={assetUrl}
            alt="预览"
            className="w-full h-full object-cover"
          />
        </div>
      )}
      {assetUrl && isAudio && !assetUrl.startsWith('pending://') && (
        <div className="mb-2">
          <audio
            src={assetUrl}
            controls
            className="w-full h-8"
          />
        </div>
      )}
      {assetUrl && isVideo && !assetUrl.startsWith('pending://') && (
        <div className="mb-2 relative w-full h-24 bg-gray-100 rounded overflow-hidden">
          <video
            src={assetUrl}
            controls
            className="w-full h-full object-cover"
          />
        </div>
      )}
      {assetUrl && isMinigame && (
        <div className="mb-2 relative w-full h-16 bg-purple-50 rounded overflow-hidden flex items-center justify-center border border-purple-200">
          <div className="text-center">
            <Gamepad2
              size={20}
              className="mx-auto text-purple-500"
            />
            <p className="text-xs text-purple-600 mt-1">小游戏已生成</p>
          </div>
        </div>
      )}
      {assetUrl && assetUrl.startsWith('pending://') && (
        <div className="mb-2 relative w-full h-24 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
          <div className="text-center">
            <Clock
              size={24}
              className="mx-auto text-gray-400 animate-pulse"
            />
            <p className="text-xs text-gray-500 mt-1">生成中...</p>
          </div>
        </div>
      )}
    </div>
  );
}
