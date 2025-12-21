'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export interface UseAudioPlayerReturn {
  isPlaying: boolean;
  isPaused: boolean;
  play: (url: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  replay: () => void;
  toggle: () => void;
}

/**
 * 音频播放器 Hook
 * 管理音频的播放、暂停、停止和重播
 */
export function useAudioPlayer(): UseAudioPlayerReturn {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const currentUrlRef = useRef<string | null>(null);

  // 清理函数
  const cleanup = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    setIsPlaying(false);
    setIsPaused(false);
  }, []);

  // 组件卸载时清理
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const play = useCallback((url: string) => {
    // 清理之前的音频
    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(url);
    audioRef.current = audio;
    currentUrlRef.current = url;

    audio.onplay = () => {
      setIsPlaying(true);
      setIsPaused(false);
    };

    audio.onpause = () => {
      if (audio.currentTime < audio.duration) {
        setIsPaused(true);
      }
      setIsPlaying(false);
    };

    audio.onended = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    audio.onerror = () => {
      console.error('Audio playback error');
      setIsPlaying(false);
      setIsPaused(false);
    };

    audio.play().catch((e) => {
      console.error('Failed to play audio:', e);
    });
  }, []);

  const pause = useCallback(() => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
    }
  }, []);

  const resume = useCallback(() => {
    if (audioRef.current && audioRef.current.paused) {
      audioRef.current.play().catch((e) => {
        console.error('Failed to resume audio:', e);
      });
    }
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setIsPaused(false);
    }
  }, []);

  const replay = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((e) => {
        console.error('Failed to replay audio:', e);
      });
    }
  }, []);

  const toggle = useCallback(() => {
    if (isPlaying) {
      pause();
    } else if (isPaused) {
      resume();
    } else if (currentUrlRef.current) {
      play(currentUrlRef.current);
    }
  }, [isPlaying, isPaused, pause, resume, play]);

  return {
    isPlaying,
    isPaused,
    play,
    pause,
    resume,
    stop,
    replay,
    toggle,
  };
}
