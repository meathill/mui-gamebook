'use client';

import { useState, useRef, ChangeEvent } from 'react';
import { ImageIcon, Music, Video, Gamepad2 } from 'lucide-react';
import type { SceneNode } from '@mui-gamebook/parser';
import { useDialog } from '@/components/Dialog';
import AssetItem from './AssetItem';
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
        const aspectRatio = 'aspectRatio' in asset ? asset.aspectRatio : undefined;
        const res = await fetch('/api/cms/assets/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: fullPrompt, gameId, type: apiType, aspectRatio }),
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
