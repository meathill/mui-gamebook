import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSfx } from '../src/game-player/use-sfx';

class MockOscillator {
  type = '';
  frequency = {
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  };
  connect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
}

class MockGain {
  gain = {
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  };
  connect = vi.fn();
}

const createdOscillators: MockOscillator[] = [];
const createdGains: MockGain[] = [];
const createdContexts: MockAudioContext[] = [];

class MockAudioContext {
  state = 'running';
  currentTime = 0;
  destination = {};
  resume = vi.fn();
  close = vi.fn().mockResolvedValue(undefined);
  createOscillator = vi.fn(() => {
    const osc = new MockOscillator();
    createdOscillators.push(osc);
    return osc;
  });
  createGain = vi.fn(() => {
    const gain = new MockGain();
    createdGains.push(gain);
    return gain;
  });
  constructor() {
    createdContexts.push(this);
  }
}

describe('useSfx', () => {
  beforeEach(() => {
    createdOscillators.length = 0;
    createdGains.length = 0;
    createdContexts.length = 0;
    (window as unknown as { AudioContext: unknown }).AudioContext = MockAudioContext;
  });

  it('playClick 创建振荡器并在短时间后停止', () => {
    const { result } = renderHook(() => useSfx(80));

    result.current.playClick();

    expect(createdOscillators).toHaveLength(1);
    expect(createdOscillators[0].type).toBe('sine');
    expect(createdOscillators[0].start).toHaveBeenCalled();
    expect(createdOscillators[0].stop).toHaveBeenCalled();
  });

  it('playTick / playHover / playNext 都能正常触发不抛错', () => {
    const { result } = renderHook(() => useSfx(80));

    expect(() => result.current.playTick()).not.toThrow();
    expect(() => result.current.playHover()).not.toThrow();
    expect(() => result.current.playNext()).not.toThrow();

    expect(createdOscillators).toHaveLength(3);
  });

  it('同一个 hook 实例复用同一个 AudioContext', () => {
    const { result } = renderHook(() => useSfx(80));

    result.current.playClick();
    result.current.playTick();

    expect(createdContexts).toHaveLength(1);
  });

  it('volume 变化会影响下一次播放的增益大小', () => {
    const { result, rerender } = renderHook(({ volume }) => useSfx(volume), { initialProps: { volume: 80 } });
    result.current.playClick();
    const firstGain = createdGains[0];

    rerender({ volume: 20 });
    result.current.playClick();
    const secondGain = createdGains[1];

    const firstArg = firstGain.gain.setValueAtTime.mock.calls[0][0];
    const secondArg = secondGain.gain.setValueAtTime.mock.calls[0][0];
    expect(secondArg).toBeLessThan(firstArg);
  });

  it('没有 AudioContext 支持时静默跳过，不抛异常', () => {
    (window as unknown as { AudioContext: unknown }).AudioContext = undefined;
    const { result } = renderHook(() => useSfx(80));

    expect(() => result.current.playClick()).not.toThrow();
    expect(createdOscillators).toHaveLength(0);
  });

  it('卸载时关闭 AudioContext', () => {
    const { result, unmount } = renderHook(() => useSfx(80));
    result.current.playClick();
    expect(createdContexts).toHaveLength(1);

    unmount();

    expect(createdContexts[0].close).toHaveBeenCalled();
  });
});
