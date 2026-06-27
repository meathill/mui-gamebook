import { ImageIcon, MusicNoteIcon, VideoCameraIcon, GameControllerIcon } from '@phosphor-icons/react/dist/ssr';
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
      <MusicNoteIcon
        size={size}
        className="text-gray-400"
      />
    );
  if (isVideo)
    return (
      <VideoCameraIcon
        size={size}
        className="text-gray-400"
      />
    );
  if (isMinigame)
    return (
      <GameControllerIcon
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
