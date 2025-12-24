'use client';

import { ImageIcon, Music, Video, Gamepad2 } from 'lucide-react';
import type { SceneNode } from '@mui-gamebook/parser';
import MediaAssetItem from './MediaAssetItem';
import { buildImagePrompt, buildAudioPrompt, extractCharacterIds, type AiConfig } from '@/lib/ai-prompt-builder';

interface AssetEditorProps {
  gameId: string;
  assets: SceneNode[];
  aiConfig?: AiConfig;
  onAssetsChange: (assets: SceneNode[]) => void;
}

export default function AssetEditor({ gameId, assets, aiConfig, onAssetsChange }: AssetEditorProps) {
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

  function getAiStylePrompt(asset: SceneNode): string | undefined {
    const isImage = asset.type.includes('image');
    const isAudio = asset.type.includes('audio');

    if (isImage && aiConfig) {
      const characterIds =
        'characters' in asset
          ? asset.characters
          : 'character' in asset
            ? ([asset.character].filter(Boolean) as string[])
            : 'prompt' in asset
              ? extractCharacterIds(asset.prompt)
              : [];
      return buildImagePrompt('', aiConfig, characterIds);
    }

    if (isAudio && aiConfig) {
      return buildAudioPrompt('', aiConfig);
    }

    return undefined;
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

      <div className="space-y-3">
        {assets.length > 0 ? (
          assets.map((asset, i) => (
            <MediaAssetItem
              key={i}
              asset={asset}
              gameId={gameId}
              variant="compact"
              showDelete={true}
              aiStylePrompt={getAiStylePrompt(asset)}
              aiCharacters={aiConfig?.characters}
              onAssetChange={(field, value) => handleAssetChange(i, field, value)}
              onAssetDelete={() => handleAssetDelete(i)}
            />
          ))
        ) : (
          <div className="text-xs text-gray-400 italic text-center py-2">暂无素材</div>
        )}
      </div>
    </div>
  );
}
