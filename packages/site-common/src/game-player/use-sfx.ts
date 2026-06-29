'use client';

import { useEffect, useCallback, useRef } from 'react';

export interface UseSfxReturn {
  playClick(): void;
  playTick(): void;
  playHover(): void;
  playNext(): void;
}

/**
 * 网页音效合成 Hook
 * 使用 Web Audio API 动态合成短音效（点击、打字、悬停、下一步）
 * 零资源请求，延迟极低，并且可以受 settings 中的 sfxVolume 控制
 */
export function useSfx(volume = 80): UseSfxReturn {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const volumeRef = useRef(volume);
  volumeRef.current = volume;

  const initCtx = useCallback(() => {
    if (typeof window === 'undefined') return null;
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const playClick = useCallback(() => {
    const ctx = initCtx();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    // 水滴/按键音
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime((volumeRef.current / 100) * 0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  }, [initCtx]);

  const playTick = useCallback(() => {
    const ctx = initCtx();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    // 打字机滴答声
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(900, ctx.currentTime);

    gain.gain.setValueAtTime((volumeRef.current / 100) * 0.03, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.025);

    osc.start();
    osc.stop(ctx.currentTime + 0.025);
  }, [initCtx]);

  const playHover = useCallback(() => {
    const ctx = initCtx();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    // 轻柔的高频悬停微音
    osc.type = 'sine';
    osc.frequency.setValueAtTime(750, ctx.currentTime);

    gain.gain.setValueAtTime((volumeRef.current / 100) * 0.025, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.04);

    osc.start();
    osc.stop(ctx.currentTime + 0.04);
  }, [initCtx]);

  const playNext = useCallback(() => {
    const ctx = initCtx();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    // 页面翻动/下滑切换音 (向下扫频)
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime((volumeRef.current / 100) * 0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);

    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  }, [initCtx]);

  // 卸载时关闭连接，防止内存占用
  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  return {
    playClick,
    playTick,
    playHover,
    playNext,
  };
}
