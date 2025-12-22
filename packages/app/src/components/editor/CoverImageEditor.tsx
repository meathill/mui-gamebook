'use client';

import { useState, useRef } from 'react';
import { Upload, Sparkles, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useDialog } from '@/components/Dialog';
import { useCmsConfig, getAspectRatios } from '@/hooks/useCmsConfig';

interface CoverImageEditorProps {
  gameId: string;
  coverImage?: string;
  aiStylePrompt?: string;
  onCoverChange: (url: string) => void;
}

export default function CoverImageEditor({ gameId, coverImage, aiStylePrompt, onCoverChange }: CoverImageEditorProps) {
  const [generatingCover, setGeneratingCover] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverPrompt, setCoverPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('3:2');
  const [showCoverGen, setShowCoverGen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dialog = useDialog();
  const { data: cmsConfig } = useCmsConfig();
  const aspectRatios = getAspectRatios(cmsConfig?.defaultAiProvider);

  async function handleUploadCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCover(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('id', gameId);
    formData.append('type', 'game_cover');

    try {
      const res = await fetch('/api/cms/assets/upload', {
        method: 'POST',
        body: formData,
      });
      const data = (await res.json()) as { url: string; error?: string };
      if (res.ok) {
        onCoverChange(data.url);
      } else {
        await dialog.error(data.error || '上传失败');
      }
    } catch (e) {
      await dialog.error('上传失败：' + (e as Error).message);
    } finally {
      setUploadingCover(false);
    }
  }

  async function handleGenerateCover() {
    if (!coverPrompt) return;

    setGeneratingCover(true);
    try {
      const res = await fetch('/api/cms/assets/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: [aiStylePrompt || '', coverPrompt].filter(Boolean).join('\n'),
          gameId,
          type: 'ai_image',
          aspectRatio,
        }),
      });
      const data = (await res.json()) as { url: string; error?: string };
      if (res.ok) {
        onCoverChange(data.url);
        setShowCoverGen(false);
      } else {
        await dialog.error(data.error || '生成失败');
      }
    } catch (e) {
      await dialog.error('生成失败：' + (e as Error).message);
    } finally {
      setGeneratingCover(false);
    }
  }

  const hasCover = coverImage && !coverImage.startsWith('prompt:');

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">封面图片</label>
      <div className="relative w-full aspect-[3/2] bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center overflow-hidden hover:border-blue-400 transition-colors group">
        {hasCover ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverImage}
              alt="封面"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 bg-white rounded-full hover:bg-gray-100">
                <Upload size={16} />
              </button>
              <button
                onClick={() => setShowCoverGen(true)}
                className="p-2 bg-white rounded-full hover:bg-gray-100">
                <Sparkles size={16} />
              </button>
            </div>
          </>
        ) : (
          <div className="text-center p-4">
            <ImageIcon className="mx-auto h-10 w-10 text-gray-400 mb-2" />
            <div className="flex flex-col gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingCover}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                {uploadingCover ? '上传中...' : '上传图片'}
              </button>
              <span className="text-xs text-gray-400">- 或者 -</span>
              <button
                onClick={() => setShowCoverGen(!showCoverGen)}
                className="text-sm text-purple-600 hover:text-purple-800 font-medium">
                AI 生成封面
              </button>
            </div>
          </div>
        )}
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={handleUploadCover}
        />
      </div>

      {showCoverGen && (
        <div className="mt-3 p-3 bg-purple-50 rounded-md border border-purple-100">
          <textarea
            placeholder="描述你想要的封面..."
            value={coverPrompt}
            onChange={(e) => setCoverPrompt(e.target.value)}
            className="w-full p-2 text-sm border rounded mb-2 h-20 resize-none"
          />
          <div className="flex gap-2 mb-2">
            <label className="text-xs text-gray-600 self-center">比例:</label>
            <select
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value)}
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
          <button
            onClick={handleGenerateCover}
            disabled={generatingCover || !coverPrompt}
            className="w-full py-1.5 bg-purple-600 text-white rounded text-xs font-medium hover:bg-purple-700 disabled:opacity-50 flex justify-center items-center gap-2">
            {generatingCover ? (
              <Loader2
                size={12}
                className="animate-spin"
              />
            ) : (
              <Sparkles size={12} />
            )}
            生成封面
          </button>
        </div>
      )}
    </div>
  );
}
