import { Clock, Gamepad2 } from 'lucide-react';
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
      <div className={`relative w-full ${imageHeight} bg-gray-100 rounded overflow-hidden`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt="预览"
          className="w-full h-full object-cover"
        />
      </div>
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
