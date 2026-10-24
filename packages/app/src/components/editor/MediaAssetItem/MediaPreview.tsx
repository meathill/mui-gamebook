'use client';

import { useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { ClockIcon, GameControllerIcon, XIcon } from '@phosphor-icons/react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import type { MediaPreviewProps } from './types';

export default function MediaPreview({
  url,
  isImage,
  isAudio,
  isVideo,
  isMinigame,
  isPending,
  variant = 'compact',
}: MediaPreviewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const isFeatured = variant === 'featured';
  const imageHeight = isFeatured ? 'h-full' : 'h-24';

  if (isPending) {
    return (
      <div
        className={`relative w-full ${imageHeight} bg-gray-100 rounded overflow-hidden flex items-center justify-center`}>
        <div className="text-center">
          <ClockIcon
            size={isFeatured ? 40 : 24}
            className="mx-auto text-gray-400 animate-pulse"
          />
          <p className={`${isFeatured ? 'text-sm' : 'text-xs'} text-gray-500 mt-1`}>生成中...</p>
        </div>
      </div>
    );
  }

  if (isImage) {
    return (
      <>
        <div
          className={`relative w-full ${imageHeight} bg-gray-100 rounded overflow-hidden cursor-pointer hover:opacity-90 transition-opacity`}
          onClick={() => setIsModalOpen(true)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt="预览"
            className="w-full h-full object-cover"
          />
        </div>

        <Dialog
          open={isModalOpen}
          onOpenChange={setIsModalOpen}>
          {/* 图片灯箱：去掉卡片外观，只保留居中大图与右上角关闭按钮 */}
          <DialogContent
            showCloseButton={false}
            className="max-h-[90vh] max-w-[90vw] overflow-visible border-none bg-transparent p-0 shadow-none">
            <DialogPrimitive.Close className="absolute -top-10 right-0 rounded-full p-2 text-white/80 transition-colors hover:text-white focus-visible:outline-none">
              <XIcon size={24} />
              <span className="sr-only">关闭</span>
            </DialogPrimitive.Close>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt="完整预览"
              className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
            />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  if (isAudio) {
    return (
      <div className="mb-2">
        <audio
          src={url}
          controls
          className="w-full h-8"
        />
      </div>
    );
  }

  if (isVideo) {
    return (
      <div className={`relative w-full ${imageHeight} bg-gray-100 rounded overflow-hidden`}>
        <video
          src={url}
          controls
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  if (isMinigame) {
    return (
      <div className="relative w-full h-16 bg-purple-50 rounded overflow-hidden flex items-center justify-center border border-purple-200">
        <div className="text-center">
          <GameControllerIcon
            size={20}
            className="mx-auto text-purple-500"
          />
          <p className="text-xs text-purple-600 mt-1">小游戏已生成</p>
        </div>
      </div>
    );
  }

  return null;
}
