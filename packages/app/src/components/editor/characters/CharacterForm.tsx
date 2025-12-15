import { useState } from 'react';
import { Sparkles, Upload, Loader2 } from 'lucide-react';
import type { CharacterFormData } from './index';

interface Props {
  formData: CharacterFormData;
  isCreating: boolean;
  gameId: string;
  onUpdate: (updates: Partial<CharacterFormData>) => void;
  onSave: () => void;
}

export default function CharacterForm({ formData, isCreating, gameId, onUpdate, onSave }: Props) {
  const [generatingImage, setGeneratingImage] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleGenerateImage = async () => {
    if (!formData.image_prompt) return;
    setGeneratingImage(true);
    try {
      const res = await fetch(`/api/cms/games/${gameId}/generate-character-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId: formData.id,
          prompt: formData.image_prompt,
        }),
      });
      if (!res.ok) throw new Error('生成失败');
      const data = (await res.json()) as { url: string };
      onUpdate({ image_url: data.url });
    } catch (e) {
      console.error('生成角色图片失败:', e);
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      formDataUpload.append('type', 'character');
      formDataUpload.append('characterId', formData.id);

      const res = await fetch(`/api/cms/games/${gameId}/upload`, {
        method: 'POST',
        body: formDataUpload,
      });
      if (!res.ok) throw new Error('上传失败');
      const data = (await res.json()) as { url: string };
      onUpdate({ image_url: data.url });
    } catch (e) {
      console.error('上传角色图片失败:', e);
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">{isCreating ? '创建新角色' : '编辑角色'}</h3>

      <div className="space-y-5">
        {/* 角色 ID */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">角色 ID</label>
          <input
            type="text"
            value={formData.id}
            onChange={(e) => onUpdate({ id: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="例如: protagonist, villain"
          />
          <p className="mt-1 text-xs text-gray-500">用于在脚本中引用角色</p>
        </div>

        {/* 角色名称 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">角色名称</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="例如: 张大侠"
          />
        </div>

        {/* 角色描述 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">角色描述</label>
          <textarea
            value={formData.description}
            onChange={(e) => onUpdate({ description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={3}
            placeholder="描述角色的背景、性格、特点等"
          />
        </div>

        {/* 图像提示词 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">图像生成提示词</label>
          <textarea
            value={formData.image_prompt}
            onChange={(e) => onUpdate({ image_prompt: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={2}
            placeholder="用于 AI 生成角色头像的提示词"
          />
        </div>

        {/* 角色头像 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">角色头像</label>
          <div className="flex items-start gap-4">
            {/* 头像预览 */}
            <div className="w-24 h-24 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300">
              {formData.image_url ? (
                <img
                  src={formData.image_url}
                  alt={formData.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-3xl text-gray-300">
                  {formData.name ? formData.name.charAt(0).toUpperCase() : '?'}
                </span>
              )}
            </div>

            {/* 操作按钮 */}
            <div className="flex flex-col gap-2">
              <button
                onClick={handleGenerateImage}
                disabled={!formData.image_prompt || generatingImage}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50">
                {generatingImage ? (
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                ) : (
                  <Sparkles size={16} />
                )}
                {generatingImage ? '生成中...' : 'AI 生成'}
              </button>

              <label className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 cursor-pointer">
                {uploadingImage ? (
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                ) : (
                  <Upload size={16} />
                )}
                {uploadingImage ? '上传中...' : '上传图片'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* 语音样本 URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">语音样本 URL</label>
          <input
            type="text"
            value={formData.voice_sample_url}
            onChange={(e) => onUpdate({ voice_sample_url: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="用于生成角色语音的样本音频 URL"
          />
        </div>

        {/* 保存按钮（仅创建时显示） */}
        {isCreating && (
          <button
            onClick={onSave}
            className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium">
            创建角色
          </button>
        )}
      </div>
    </div>
  );
}
