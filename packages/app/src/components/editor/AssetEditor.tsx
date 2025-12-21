'use client';

import { useState, useRef, ChangeEvent } from 'react';
import {
  CheckIcon,
  Trash2,
  ImageIcon,
  Loader2,
  Upload,
  Sparkles,
  Music,
  Video,
  Clock,
  Gamepad2,
  List,
} from 'lucide-react';
import type { SceneNode } from '@mui-gamebook/parser';
import { useDialog } from '@/components/Dialog';
import MiniGameSelector from './MiniGameSelector';
import { buildImagePrompt, buildAudioPrompt, extractCharacterIds, type AiConfig } from '@/lib/ai-prompt-builder';

interface AssetEditorProps {
  gameId: string;
  assets: SceneNode[];
  aiConfig?: AiConfig;
  onAssetsChange: (assets: SceneNode[]) => void;
}

export default function AssetEditor({ gameId, assets, aiConfig, onAssetsChange }: AssetEditorProps) {
  const [generatingIndex, setGeneratingIndex] = useState<number>(-1);
  const [openGeneratorIndex, setOpenGeneratorIndex] = useState<number>(-1);
  const [uploadingIndex, setUploadingIndex] = useState<number>(-1);
  const [showMinigameSelector, setShowMinigameSelector] = useState<number>(-1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingUploadIndexRef = useRef<number>(-1);
  const pendingAssetsRef = useRef<SceneNode[] | null>(null);
  const dialog = useDialog();

  function handleAssetChange(index: number, field: string, value: string) {
    const newAssets = [...assets];
    newAssets[index] = { ...newAssets[index], [field]: value };
    onAssetsChange(newAssets);
  }

  function handleAssetDelete(index: number) {
    const newAssets = [...assets];
    newAssets.splice(index, 1);
    onAssetsChange(newAssets);
  }

  function handleAddAsset(mediaType: 'image' | 'audio' | 'video' | 'minigame') {
    const newAssets = [...assets];
    if (mediaType === 'audio') {
      newAssets.push({ type: 'ai_audio', prompt: '', audioType: 'sfx' });
    } else if (mediaType === 'minigame') {
      newAssets.push({ type: 'minigame', prompt: '', variables: {} });
    } else {
      newAssets.push({ type: `ai_${mediaType}` as 'ai_image' | 'ai_video', prompt: '' });
    }
    onAssetsChange(newAssets);
  }

  async function handleUpload(file: File, index: number) {
    if (!gameId) return;
    setUploadingIndex(index);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('id', gameId);
    formData.append('type', 'asset');

    try {
      const res = await fetch('/api/cms/assets/upload', {
        method: 'POST',
        body: formData,
      });
      const data = (await res.json()) as { url: string; error?: string };
      if (res.ok) {
        const currentAssets = pendingAssetsRef.current || assets;
        const newAssets = [...currentAssets];
        if (newAssets[index]) {
          newAssets[index] = { ...newAssets[index], url: data.url } as SceneNode;
          onAssetsChange(newAssets);
        }
        pendingAssetsRef.current = null;
      } else {
        await dialog.error(data.error || '上传失败');
      }
    } catch (e) {
      await dialog.error('上传失败：' + (e as Error).message);
    } finally {
      setUploadingIndex(-1);
    }
  }

  async function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file && pendingUploadIndexRef.current !== null) {
      await handleUpload(file, pendingUploadIndexRef.current);
    }
    pendingUploadIndexRef.current = -1;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function triggerUpload(index: number, accept: string) {
    if (fileInputRef.current) {
      fileInputRef.current.accept = accept;
      pendingUploadIndexRef.current = index;
      if (!pendingAssetsRef.current) {
        pendingAssetsRef.current = [...assets];
      }
      fileInputRef.current.click();
    }
  }

  async function handleRegenerate(index: number, asset: SceneNode) {
    if (!('prompt' in asset) || !asset.prompt || !gameId) return;
    setGeneratingIndex(index);

    const isMinigame = asset.type === 'minigame';
    const mediaType = isMinigame
      ? 'minigame'
      : asset.type.includes('image')
        ? 'image'
        : asset.type.includes('audio')
          ? 'audio'
          : 'video';
    const apiType = isMinigame ? 'minigame' : `ai_${mediaType}`;

    try {
      if (isMinigame) {
        const variables = 'variables' in asset ? asset.variables : undefined;
        const res = await fetch('/api/cms/minigames', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: asset.prompt, variables }),
        });
        if (!res.ok) {
          const error = (await res.json()) as { error: string };
          await dialog.error(`生成失败：${error.error}`);
          return;
        }
        const data = (await res.json()) as { id: number; url: string };
        handleAssetChange(index, 'url', data.url);
        await dialog.alert('小游戏生成成功！');
      } else if (mediaType === 'video') {
        // 视频使用图片风格配置
        const characterIds = extractCharacterIds(asset.prompt);
        const fullPrompt = buildImagePrompt(asset.prompt, aiConfig, characterIds);
        const res = await fetch('/api/cms/assets/generate-async', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: fullPrompt, gameId, type: apiType }),
        });
        if (!res.ok) {
          const error = (await res.json()) as { error: string };
          await dialog.error(`生成失败：${error.error}`);
          return;
        }
        const data = (await res.json()) as { url: string };
        handleAssetChange(index, 'url', data.url);
        await dialog.alert('视频生成已启动，请稍等几分钟。');
      } else if (mediaType === 'image') {
        // 图片使用 ai.style.image 和角色描述
        const characterIds =
          'characters' in asset
            ? asset.characters
            : 'character' in asset
              ? ([asset.character].filter(Boolean) as string[])
              : extractCharacterIds(asset.prompt);
        const fullPrompt = buildImagePrompt(asset.prompt, aiConfig, characterIds);
        const res = await fetch('/api/cms/assets/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: fullPrompt, gameId, type: apiType }),
        });
        if (!res.ok) {
          const error = (await res.json()) as { error: string };
          await dialog.error(`生成失败：${error.error}`);
          return;
        }
        const data = (await res.json()) as { url: string };
        handleAssetChange(index, 'url', data.url);
      } else {
        // 音频使用 ai.style.audio
        const fullPrompt = buildAudioPrompt(asset.prompt, aiConfig);
        const res = await fetch('/api/cms/assets/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: fullPrompt, gameId, type: apiType }),
        });
        if (!res.ok) {
          const error = (await res.json()) as { error: string };
          await dialog.error(`生成失败：${error.error}`);
          return;
        }
        const data = (await res.json()) as { url: string };
        handleAssetChange(index, 'url', data.url);
      }
    } catch (e) {
      await dialog.error(`错误：${(e as Error).message}`);
    } finally {
      setGeneratingIndex(-1);
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <label className="block text-xs font-medium text-gray-700">素材</label>
        <div className="flex gap-1">
          <button
            onClick={() => handleAddAsset('image')}
            className="p-1 text-blue-600 hover:bg-blue-50 rounded flex items-center gap-0.5"
            title="添加图片">
            <ImageIcon size={14} />
            <span className="text-xs">图片</span>
          </button>
          <button
            onClick={() => handleAddAsset('audio')}
            className="p-1 text-blue-600 hover:bg-blue-50 rounded flex items-center gap-0.5"
            title="添加音频">
            <Music size={14} />
            <span className="text-xs">音频</span>
          </button>
          <button
            onClick={() => handleAddAsset('video')}
            className="p-1 text-blue-600 hover:bg-blue-50 rounded flex items-center gap-0.5"
            title="添加视频">
            <Video size={14} />
            <span className="text-xs">视频</span>
          </button>
          <button
            onClick={() => handleAddAsset('minigame')}
            className="p-1 text-purple-600 hover:bg-purple-50 rounded flex items-center gap-0.5"
            title="添加小游戏">
            <Gamepad2 size={14} />
            <span className="text-xs">小游戏</span>
          </button>
        </div>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileSelect}
      />

      <div className="space-y-3">
        {assets.length > 0 ? (
          assets.map((asset, i) => (
            <AssetItem
              key={i}
              index={i}
              asset={asset}
              generatingIndex={generatingIndex}
              uploadingIndex={uploadingIndex}
              openGeneratorIndex={openGeneratorIndex}
              showMinigameSelector={showMinigameSelector}
              onAssetChange={handleAssetChange}
              onAssetDelete={handleAssetDelete}
              onRegenerate={handleRegenerate}
              onTriggerUpload={triggerUpload}
              onToggleGenerator={(idx) => setOpenGeneratorIndex(idx === openGeneratorIndex ? -1 : idx)}
              onToggleMinigameSelector={(idx) => setShowMinigameSelector(idx === showMinigameSelector ? -1 : idx)}
            />
          ))
        ) : (
          <div className="text-xs text-gray-400 italic text-center py-2">暂无素材</div>
        )}
      </div>
    </div>
  );
}

interface AssetItemProps {
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

function AssetItem({
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
        <div className="relative">
          <textarea
            value={assetPrompt || ''}
            onChange={(e) => onAssetChange(index, 'prompt', e.target.value)}
            className="w-full p-2 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-purple-500 resize-none h-16"
            placeholder="输入 AI 生成提示词..."
          />
          <button
            className="size-6 bg-purple-600 text-white hover:bg-purple-500 absolute right-2 bottom-2 rounded flex items-center justify-center p-1"
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
