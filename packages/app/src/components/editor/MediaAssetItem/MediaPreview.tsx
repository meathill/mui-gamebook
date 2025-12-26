'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Clock, Gamepad2, X } from 'lucide-react';
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
          <Clock
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

        <Dialog.Root
          open={isModalOpen}
          onOpenChange={setIsModalOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
            <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] max-w-[90vw] -translate-x-1/2 -translate-y-1/2 focus:outline-none">
              <Dialog.Close className="absolute -top-10 right-0 rounded-full p-2 text-white/80 hover:text-white transition-colors">
                <X size={24} />
                <span className="sr-only">关闭</span>
              </Dialog.Close>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt="完整预览"
                className="max-h-[85vh] max-w-[90vw] rounded-lg shadow-2xl object-contain"
              />
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
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
          <Gamepad2
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
