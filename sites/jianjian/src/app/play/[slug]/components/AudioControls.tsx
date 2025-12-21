'use client';

import type { UseAudioPlayerReturn } from '@mui-gamebook/app/hooks/useAudioPlayer';

interface AudioControlsProps {
  audioPlayer: UseAudioPlayerReturn;
}

/**
 * 音频控制组件
 */
export default function AudioControls({ audioPlayer }: AudioControlsProps) {
  return (
    <div className="flex items-center justify-center gap-3 py-3 bg-primary-light/30 border-b border-card-border">
      <span className="text-foreground/50 text-sm">🔊 语音</span>
      <button
        onClick={audioPlayer.toggle}
        className="p-2 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
        title={audioPlayer.isPlaying ? '暂停' : audioPlayer.isPaused ? '继续' : '播放'}>
        {audioPlayer.isPlaying ? '⏸️' : '▶️'}
      </button>
      <button
        onClick={audioPlayer.replay}
        className="p-2 rounded-full bg-foreground/5 hover:bg-foreground/10 text-foreground/70 transition-colors"
        title="重播">
        🔄
      </button>
      <span className="text-foreground/40 text-xs">
        {audioPlayer.isPlaying ? '正在播放...' : audioPlayer.isPaused ? '已暂停' : ''}
      </span>
    </div>
  );
}
