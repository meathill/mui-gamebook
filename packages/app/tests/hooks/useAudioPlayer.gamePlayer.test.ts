import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAudioPlayer } from '@/components/game-player/useAudioPlayer';

// 文件名带 .gamePlayer 后缀：另有 src/hooks/useAudioPlayer.ts 是几乎重复的
// 独立实现（GamePlayer.tsx / sites/jianjian 用），二者同名会在打平的 tests/hooks/
// 目录下冲突，因此用来源子目录限定区分，见 tests/hooks/useAudioPlayer.test.ts
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

describe('useAudioPlayer', () => {
  it('play() 创建 Audio 实例并记录 currentUrl', () => {
    const { result } = renderHook(() => useAudioPlayer());

    act(() => result.current.play('https://x.com/a.mp3'));

    expect(instances).toHaveLength(1);
    expect(instances[0].play).toHaveBeenCalledTimes(1);
    expect(result.current.currentUrl).toBe('https://x.com/a.mp3');
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
    instances[0].currentTime = 10; // 小于 duration=100，属于中途暂停
    instances[0].paused = true; // 现实中 pause 事件必然伴随 paused 变为 true

    act(() => instances[0].onpause?.());

    expect(result.current.isPlaying).toBe(false);
    expect(result.current.isPaused).toBe(true);
  });

  it('播放到结尾触发 onpause 时不进入 isPaused（currentTime 已等于 duration）', () => {
    const { result } = renderHook(() => useAudioPlayer());
    act(() => result.current.play('https://x.com/a.mp3'));
    act(() => instances[0].onplay?.());
    instances[0].currentTime = 100;
    instances[0].paused = true;

    act(() => instances[0].onpause?.());

    expect(result.current.isPaused).toBe(false);
    expect(result.current.isPlaying).toBe(false);
  });

  it('onended 触发后播放/暂停状态都复位', () => {
    const { result } = renderHook(() => useAudioPlayer());
    act(() => result.current.play('https://x.com/a.mp3'));
    act(() => instances[0].onplay?.());

    act(() => instances[0].onended?.());

    expect(result.current.isPlaying).toBe(false);
    expect(result.current.isPaused).toBe(false);
  });

  it('onended 触发后调用传入的 onEnded 回调（用于有声书逐句顺序播放）', () => {
    const onEnded = vi.fn();
    const { result } = renderHook(() => useAudioPlayer(onEnded));
    act(() => result.current.play('https://x.com/a.mp3'));
    act(() => instances[0].onplay?.());

    act(() => instances[0].onended?.());

    expect(onEnded).toHaveBeenCalledTimes(1);
  });

  it('没有传入 onEnded 时 onended 触发不会抛出异常', () => {
    const { result } = renderHook(() => useAudioPlayer());
    act(() => result.current.play('https://x.com/a.mp3'));

    expect(() => act(() => instances[0].onended?.())).not.toThrow();
  });

  it('onerror 触发后状态复位且不抛出异常', () => {
    const { result } = renderHook(() => useAudioPlayer());
    act(() => result.current.play('https://x.com/a.mp3'));
    act(() => instances[0].onplay?.());

    expect(() => act(() => instances[0].onerror?.())).not.toThrow();
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.isPaused).toBe(false);
  });

  it('从未调用 play() 时调用 pause() 是空操作（audioRef 尚未创建）', () => {
    const { result } = renderHook(() => useAudioPlayer());

    expect(() => act(() => result.current.pause())).not.toThrow();
    expect(instances).toHaveLength(0);
  });

  it('调用 play() 后 paused 立即变为 false，此时 pause() 会调用底层 pause', () => {
    const { result } = renderHook(() => useAudioPlayer());
    act(() => result.current.play('https://x.com/a.mp3'));

    act(() => result.current.pause());

    expect(instances[0].pause).toHaveBeenCalledTimes(1);
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

  it('toggle() 播放中调用会暂停', () => {
    const { result } = renderHook(() => useAudioPlayer());
    act(() => result.current.play('https://x.com/a.mp3'));
    act(() => instances[0].onplay?.());

    act(() => result.current.toggle());

    expect(instances[0].pause).toHaveBeenCalledTimes(1);
  });

  it('toggle() 暂停中调用会恢复播放', () => {
    const { result } = renderHook(() => useAudioPlayer());
    act(() => result.current.play('https://x.com/a.mp3'));
    act(() => instances[0].onplay?.());
    instances[0].currentTime = 10;
    instances[0].paused = true;
    act(() => instances[0].onpause?.());

    act(() => result.current.toggle());

    expect(instances[0].play).toHaveBeenCalledTimes(2);
  });

  it('toggle() 在 stop 之后（有 currentUrl 但未播放未暂停）重新创建播放', () => {
    const { result } = renderHook(() => useAudioPlayer());
    act(() => result.current.play('https://x.com/a.mp3'));
    act(() => result.current.stop());

    act(() => result.current.toggle());

    expect(instances).toHaveLength(2);
  });

  it('play() 新音频前会先暂停上一个音频', () => {
    const { result } = renderHook(() => useAudioPlayer());
    act(() => result.current.play('https://x.com/a.mp3'));
    const first = instances[0];

    act(() => result.current.play('https://x.com/b.mp3'));

    expect(first.pause).toHaveBeenCalledTimes(1);
    expect(instances).toHaveLength(2);
  });

  it('卸载时清理音频：暂停并清空 src', () => {
    const { result, unmount } = renderHook(() => useAudioPlayer());
    act(() => result.current.play('https://x.com/a.mp3'));
    const instance = instances[0];

    unmount();

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
