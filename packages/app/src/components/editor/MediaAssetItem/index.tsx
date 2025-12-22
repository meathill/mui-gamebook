'use client';

import { useState, useRef, ChangeEvent } from 'react';
import { Trash2, Loader2, Upload, Sparkles, List } from 'lucide-react';
import type { SceneNode } from '@mui-gamebook/parser';
import { useDialog } from '@/components/Dialog';
import MiniGameSelector from '../MiniGameSelector';
import { useCmsConfig, getAspectRatios } from '@/hooks/useCmsConfig';
import type { MediaAssetItemProps } from './types';
import TypeIcon from './TypeIcon';
import MediaPreview from './MediaPreview';
import MediaGenerator from './MediaGenerator';

export type { MediaAssetItemProps } from './types';

export default function MediaAssetItem({
  asset,
  gameId,
  variant = 'compact',
  showDelete = true,
  aiStylePrompt,
  onAssetChange,
  onAssetDelete,
}: MediaAssetItemProps) {
  const [showGenerator, setShowGenerator] = useState(false);
  const [showMinigameSelector, setShowMinigameSelector] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dialog = useDialog();
  const { data: cmsConfig } = useCmsConfig();
  const aspectRatios = getAspectRatios(cmsConfig?.defaultAiProvider);

  const assetUrl = 'url' in asset ? asset.url : undefined;
  const assetPrompt = 'prompt' in asset ? asset.prompt : '';
  const assetAspectRatio = 'aspectRatio' in asset ? asset.aspectRatio || '1:1' : '1:1';
  const isImage = asset.type.includes('image');
  const isAudio = asset.type.includes('audio');
  const isVideo = asset.type.includes('video');
  const isMinigame = asset.type === 'minigame';
  const isFeatured = variant === 'featured';

  const hasContent = assetUrl && !assetUrl.startsWith('prompt:') && !assetUrl.startsWith('pending://');
  const isPending = assetUrl?.startsWith('pending://');

  function getAcceptType() {
    if (isImage) return 'image/*';
    if (isAudio) return 'audio/*';
    if (isVideo) return 'video/*';
    return '*/*';
  }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('id', gameId);
    formData.append('type', isFeatured ? 'game_cover' : 'asset');

    try {
      const res = await fetch('/api/cms/assets/upload', {
        method: 'POST',
        body: formData,
      });
      const data = (await res.json()) as { url: string; error?: string };
      if (res.ok) {
        onAssetChange('url', data.url);
      } else {
        await dialog.error(data.error || '上传失败');
      }
    } catch (e) {
      await dialog.error('上传失败：' + (e as Error).message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  async function handleGenerate() {
    if (!assetPrompt) return;

    setIsGenerating(true);
    try {
      const fullPrompt = aiStylePrompt ? `${aiStylePrompt}\n${assetPrompt}` : assetPrompt;
      const aspectRatio = 'aspectRatio' in asset ? asset.aspectRatio : undefined;

      const res = await fetch('/api/cms/assets/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: fullPrompt,
          gameId,
          type: 'ai_image',
          aspectRatio,
        }),
      });
      const data = (await res.json()) as { url: string; error?: string };
      if (res.ok) {
        onAssetChange('url', data.url);
        setShowGenerator(false);
      } else {
        await dialog.error(data.error || '生成失败');
      }
    } catch (e) {
      await dialog.error('生成失败：' + (e as Error).message);
    } finally {
      setIsGenerating(false);
    }
  }

  // Featured 模式（封面样式）
  if (isFeatured) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">封面</label>
        <div className="relative w-full aspect-[3/2] bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center overflow-hidden hover:border-blue-400 transition-colors group">
          {hasContent ? (
            <>
              <MediaPreview
                url={assetUrl!}
                isImage={isImage}
                isAudio={isAudio}
                isVideo={isVideo}
                isMinigame={isMinigame}
                isPending={false}
                variant="featured"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 bg-white rounded-full hover:bg-gray-100"
                  disabled={isUploading}>
                  {isUploading ? (
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                  ) : (
                    <Upload size={16} />
                  )}
                </button>
                <button
                  onClick={() => setShowGenerator(true)}
                  className="p-2 bg-white rounded-full hover:bg-gray-100"
                  disabled={isGenerating}>
                  {isGenerating ? (
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                  ) : (
                    <Sparkles size={16} />
                  )}
                </button>
              </div>
            </>
          ) : isPending ? (
            <MediaPreview
              url=""
              isImage={false}
              isAudio={false}
              isVideo={false}
              isMinigame={false}
              isPending={true}
              variant="featured"
            />
          ) : (
            <div className="text-center p-4">
              <TypeIcon
                isImage={isImage}
                isAudio={isAudio}
                isVideo={isVideo}
                isMinigame={isMinigame}
                size={40}
              />
              <div className="flex flex-col gap-2 mt-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                  {isUploading ? '上传中...' : '上传文件'}
                </button>
                <span className="text-xs text-gray-400">- 或者 -</span>
                <button
                  onClick={() => setShowGenerator(!showGenerator)}
                  disabled={isGenerating}
                  className="text-sm text-purple-600 hover:text-purple-800 font-medium">
                  AI 生成
                </button>
              </div>
            </div>
          )}
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept={getAcceptType()}
            onChange={handleFileChange}
          />
        </div>

        {showGenerator && (
          <MediaGenerator
            prompt={assetPrompt}
            aspectRatio={assetAspectRatio}
            isImage={isImage}
            isGenerating={isGenerating}
            aspectRatios={aspectRatios}
            onPromptChange={(value) => onAssetChange('prompt', value)}
            onAspectRatioChange={(value) => onAssetChange('aspectRatio', value)}
            onGenerate={handleGenerate}
            variant="featured"
          />
        )}
      </div>
    );
  }

  // Compact 模式（素材列表样式）
  return (
    <div className="p-3 bg-gray-50 rounded border border-gray-200 text-sm relative group">
      <div className="flex items-center gap-1 mb-2">
        <TypeIcon
          isImage={isImage}
          isAudio={isAudio}
          isVideo={isVideo}
          isMinigame={isMinigame}
          size={16}
        />
        <span className="font-bold uppercase text-xs">{asset.type.replace('ai_', '').replace('static_', '')}</span>
        <div className="flex gap-1 ms-auto">
          {isMinigame && (
            <button
              onClick={() => setShowMinigameSelector(!showMinigameSelector)}
              className="p-1 text-xs text-blue-600 rounded hover:bg-blue-100"
              title="选择已有小游戏"
              type="button">
              <List size={14} />
            </button>
          )}
          {!isMinigame && (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="p-1 text-xs rounded disabled:text-gray-300 hover:bg-blue-100"
              title="上传素材"
              type="button">
              {isUploading ? (
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
            disabled={isGenerating}
            onClick={() => setShowGenerator(!showGenerator)}
            title="AI 生成素材"
            type="button">
            <Sparkles size={14} />
          </button>
          {showDelete && onAssetDelete && (
            <button
              onClick={onAssetDelete}
              className="p-1 text-red-600 hover:text-red-500 hover:bg-red-100"
              title="删除素材">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept={getAcceptType()}
        onChange={handleFileChange}
      />

      {isMinigame && showMinigameSelector && (
        <div className="mb-2">
          <MiniGameSelector
            onSelect={(mg) => {
              onAssetChange('url', `/api/cms/minigames/${mg.id}`);
              setShowMinigameSelector(false);
            }}
            onGenerate={() => {
              setShowMinigameSelector(false);
              setShowGenerator(true);
            }}
            isGenerating={isGenerating}
          />
        </div>
      )}

      {(showGenerator || (!assetUrl && assetPrompt)) && (
        <MediaGenerator
          prompt={assetPrompt}
          aspectRatio={assetAspectRatio}
          isImage={isImage && asset.type === 'ai_image'}
          isGenerating={isGenerating}
          aspectRatios={aspectRatios}
          onPromptChange={(value) => onAssetChange('prompt', value)}
          onAspectRatioChange={(value) => onAssetChange('aspectRatio', value)}
          onGenerate={handleGenerate}
          variant="compact"
        />
      )}

      {hasContent && (
        <MediaPreview
          url={assetUrl!}
          isImage={isImage}
          isAudio={isAudio}
          isVideo={isVideo}
          isMinigame={isMinigame}
          isPending={false}
          variant="compact"
        />
      )}
      {isPending && (
        <MediaPreview
          url=""
          isImage={false}
          isAudio={false}
          isVideo={false}
          isMinigame={false}
          isPending={true}
          variant="compact"
        />
      )}
    </div>
  );
}
