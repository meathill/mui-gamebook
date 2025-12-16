'use client';

import { Pause, Play, RotateCcw, Volume2 } from 'lucide-react';
import type { UseAudioPlayerReturn } from './useAudioPlayer';

interface AudioControlsProps {
  audioPlayer: UseAudioPlayerReturn;
  hasAudio: boolean;
}

/**
 * 音频播放控制组件
 * 显示暂停/继续/重播按钮
 */
export default function AudioControls({ audioPlayer, hasAudio }: AudioControlsProps) {
  const { isPlaying, isPaused, toggle, replay } = audioPlayer;

  if (!hasAudio) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 py-2">
      <Volume2
        size={16}
        className="text-gray-400"
      />

      {/* 播放/暂停按钮 */}
      <button
        onClick={toggle}
        className="p-2 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors"
        title={isPlaying ? '暂停' : isPaused ? '继续' : '播放'}>
        {isPlaying ? <Pause size={16} /> : <Play size={16} />}
      </button>

      {/* 重播按钮 */}
      <button
        onClick={replay}
        className="p-2 rounded-full bg-gray-50 hover:bg-gray-100 text-gray-600 transition-colors"
        title="重播">
        <RotateCcw size={16} />
      </button>

      {/* 状态文字 */}
      <span className="text-xs text-gray-400">{isPlaying ? '正在播放...' : isPaused ? '已暂停' : ''}</span>
    </div>
  );
}
