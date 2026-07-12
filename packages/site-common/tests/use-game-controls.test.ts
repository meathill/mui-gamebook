import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameControls } from '../src/game-player/use-game-controls';

describe('useGameControls', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('初始状态下自动播放和跳过都是关闭的', () => {
    const { result } = renderHook(() => useGameControls());

    expect(result.current.isAutoPlaying).toBe(false);
    expect(result.current.isSkipping).toBe(false);
  });

  it('toggleAutoPlay 打开后按间隔触发 onAutoAdvance', () => {
    const onAutoAdvance = vi.fn();
    const { result } = renderHook(() => useGameControls({ autoPlayInterval: 1000, onAutoAdvance }));

    act(() => result.current.toggleAutoPlay());
    expect(result.current.isAutoPlaying).toBe(true);

    act(() => vi.advanceTimersByTime(3000));

    expect(onAutoAdvance).toHaveBeenCalledTimes(3);
  });

  it('再次调用 toggleAutoPlay 后停止触发', () => {
    const onAutoAdvance = vi.fn();
    const { result } = renderHook(() => useGameControls({ autoPlayInterval: 1000, onAutoAdvance }));

    act(() => result.current.toggleAutoPlay());
    act(() => vi.advanceTimersByTime(1000));
    expect(onAutoAdvance).toHaveBeenCalledTimes(1);

    act(() => result.current.toggleAutoPlay());
    act(() => vi.advanceTimersByTime(3000));

    expect(onAutoAdvance).toHaveBeenCalledTimes(1);
    expect(result.current.isAutoPlaying).toBe(false);
  });

  it('打开自动播放会关闭跳过，反之亦然', () => {
    const { result } = renderHook(() => useGameControls());

    act(() => result.current.toggleSkip());
    expect(result.current.isSkipping).toBe(true);

    act(() => result.current.toggleAutoPlay());
    expect(result.current.isAutoPlaying).toBe(true);
    expect(result.current.isSkipping).toBe(false);

    act(() => result.current.toggleSkip());
    expect(result.current.isSkipping).toBe(true);
    expect(result.current.isAutoPlaying).toBe(false);
  });

  it('stopAll 同时关闭自动播放和跳过', () => {
    const { result } = renderHook(() => useGameControls());
    act(() => result.current.toggleAutoPlay());

    act(() => result.current.stopAll());

    expect(result.current.isAutoPlaying).toBe(false);
    expect(result.current.isSkipping).toBe(false);
  });

  it('卸载时清理定时器，不再触发 onAutoAdvance', () => {
    const onAutoAdvance = vi.fn();
    const { result, unmount } = renderHook(() => useGameControls({ autoPlayInterval: 1000, onAutoAdvance }));
    act(() => result.current.toggleAutoPlay());

    unmount();
    act(() => vi.advanceTimersByTime(5000));

    expect(onAutoAdvance).not.toHaveBeenCalled();
  });
});
