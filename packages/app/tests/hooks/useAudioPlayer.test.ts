import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';

// 独立播放实现的回归测试。
// 没有自己的封装，直接跨包引用这个 hook，测试理应放在源码所在的这个包里。
// 另有 src/components/game-player/useAudioPlayer.ts 是几乎重复的独立实现
// （多暴露一个 currentUrl 字段），见 tests/hooks/useAudioPlayer.gamePlayer.test.ts。
//
// jsdom 的 HTMLMediaElement.play/pause 是 "not implemented" 桩实现，不会真正
// 改变 paused 状态也不返回 Promise；因此用一个有状态的假 Audio 类替代全局构造函数，
// 测试显式调用 onplay/onpause/onended/onerror 来模拟浏览器事件时机
class FakeAudio {
  paused = true;
  currentTime = 0;
  duration = 100;
  src: string;
  onplay: (() => void) | null = null;
  onpause: (() => void) | null = null;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  play = vi.fn(() => {
    this.paused = false;
    return Promise.resolve();
  });
  pause = vi.fn(() => {
    this.paused = true;
  });

  constructor(src = '') {
    this.src = src;
  }
}

let instances: FakeAudio[] = [];

beforeEach(() => {
  instances = [];
  vi.stubGlobal(
    'Audio',
    vi.fn().mockImplementation(function (src?: string) {
      const instance = new FakeAudio(src);
      instances.push(instance);
      return instance;
    }),
  );
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('useAudioPlayer (src/hooks)', () => {
  it('初始状态未播放未暂停', () => {
    const { result } = renderHook(() => useAudioPlayer());

    expect(result.current.isPlaying).toBe(false);
    expect(result.current.isPaused).toBe(false);
  });

  it('play() 创建 Audio 实例', () => {
    const { result } = renderHook(() => useAudioPlayer());

    act(() => result.current.play('https://x.com/a.mp3'));

    expect(instances).toHaveLength(1);
    expect(instances[0].play).toHaveBeenCalledTimes(1);
  });

  it('onplay 触发后 isPlaying=true、isPaused=false', () => {
    const { result } = renderHook(() => useAudioPlayer());
    act(() => result.current.play('https://x.com/a.mp3'));

    act(() => instances[0].onplay?.());

    expect(result.current.isPlaying).toBe(true);
    expect(result.current.isPaused).toBe(false);
  });

  it('播放中途 onpause 触发后 isPaused=true、isPlaying=false', () => {
    const { result } = renderHook(() => useAudioPlayer());
    act(() => result.current.play('https://x.com/a.mp3'));
    act(() => instances[0].onplay?.());
    instances[0].currentTime = 10;
    instances[0].paused = true;

    act(() => instances[0].onpause?.());

    expect(result.current.isPlaying).toBe(false);
    expect(result.current.isPaused).toBe(true);
  });

  it('onended 触发后播放/暂停状态都复位', () => {
    const { result } = renderHook(() => useAudioPlayer());
    act(() => result.current.play('https://x.com/a.mp3'));
    act(() => instances[0].onplay?.());

    act(() => instances[0].onended?.());

    expect(result.current.isPlaying).toBe(false);
    expect(result.current.isPaused).toBe(false);
  });

  it('onerror 触发后状态复位且不抛出异常', () => {
    const { result } = renderHook(() => useAudioPlayer());
    act(() => result.current.play('https://x.com/a.mp3'));
    act(() => instances[0].onplay?.());

    expect(() => act(() => instances[0].onerror?.())).not.toThrow();
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.isPaused).toBe(false);
  });

  it('resume() 仅在 paused 为 true 时调用底层 play()', () => {
    const { result } = renderHook(() => useAudioPlayer());
    act(() => result.current.play('https://x.com/a.mp3'));
    act(() => result.current.pause());

    act(() => result.current.resume());

    expect(instances[0].play).toHaveBeenCalledTimes(2);
  });

  it('stop() 重置进度到 0 并清空播放/暂停状态', () => {
    const { result } = renderHook(() => useAudioPlayer());
    act(() => result.current.play('https://x.com/a.mp3'));
    act(() => instances[0].onplay?.());
    instances[0].currentTime = 42;

    act(() => result.current.stop());

    expect(instances[0].pause).toHaveBeenCalled();
    expect(instances[0].currentTime).toBe(0);
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.isPaused).toBe(false);
  });

  it('replay() 从头开始重新播放', () => {
    const { result } = renderHook(() => useAudioPlayer());
    act(() => result.current.play('https://x.com/a.mp3'));
    instances[0].currentTime = 50;

    act(() => result.current.replay());

    expect(instances[0].currentTime).toBe(0);
    expect(instances[0].play).toHaveBeenCalledTimes(2);
  });

  it('toggle() 在 stop 之后（未播放未暂停但曾经播放过）重新创建播放，依赖内部记住的 URL', () => {
    const { result } = renderHook(() => useAudioPlayer());
    act(() => result.current.play('https://x.com/a.mp3'));
    act(() => result.current.stop());

    act(() => result.current.toggle());

    expect(instances).toHaveLength(2);
  });

  it('提供全部必要方法', () => {
    const { result } = renderHook(() => useAudioPlayer());

    expect(typeof result.current.play).toBe('function');
    expect(typeof result.current.pause).toBe('function');
    expect(typeof result.current.resume).toBe('function');
    expect(typeof result.current.stop).toBe('function');
    expect(typeof result.current.replay).toBe('function');
    expect(typeof result.current.toggle).toBe('function');
  });

  it('卸载时清理音频：暂停并清空 src，不抛出异常', () => {
    const { result, unmount } = renderHook(() => useAudioPlayer());
    act(() => result.current.play('https://x.com/a.mp3'));
    const instance = instances[0];

    expect(() => unmount()).not.toThrow();
    expect(instance.pause).toHaveBeenCalled();
    expect(instance.src).toBe('');
  });

  it('play() 底层 Promise reject 时不抛出异常', async () => {
    vi.stubGlobal(
      'Audio',
      vi.fn().mockImplementation(function (src?: string) {
        const instance = new FakeAudio(src);
        instance.play = vi.fn(() => Promise.reject(new Error('autoplay blocked')));
        instances.push(instance);
        return instance;
      }),
    );
    const { result } = renderHook(() => useAudioPlayer());

    expect(() => act(() => result.current.play('https://x.com/a.mp3'))).not.toThrow();
    await act(async () => {
      await Promise.resolve();
    });
  });
});
