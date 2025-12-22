import { ImageIcon, Music, Video, Gamepad2 } from 'lucide-react';
import type { TypeIconProps } from './types';

export default function TypeIcon({ isImage, isAudio, isVideo, isMinigame, size }: TypeIconProps) {
  if (isImage)
    return (
      <ImageIcon
        size={size}
        className="text-gray-400"
      />
    );
  if (isAudio)
    return (
      <Music
        size={size}
        className="text-gray-400"
      />
    );
  if (isVideo)
    return (
      <Video
        size={size}
        className="text-gray-400"
      />
    );
  if (isMinigame)
    return (
      <Gamepad2
        size={size}
        className="text-purple-500"
      />
    );
  return (
    <ImageIcon
      size={size}
      className="text-gray-400"
    />
  );
}
