/**
 * useAudioPlayer Hook 测试
 * 测试音频播放器的核心功能
 */

import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
// 直接从共享包的源文件导入，避免模块解析问题
import { useAudioPlayer } from '../../../../../../packages/app/src/hooks/useAudioPlayer';

describe('useAudioPlayer', () => {
  it('初始状态应该是未播放', () => {
    const { result } = renderHook(() => useAudioPlayer());

    expect(result.current.isPlaying).toBe(false);
    expect(result.current.isPaused).toBe(false);
  });

  it('应该提供所有必要的方法', () => {
    const { result } = renderHook(() => useAudioPlayer());

    expect(typeof result.current.play).toBe('function');
    expect(typeof result.current.pause).toBe('function');
    expect(typeof result.current.resume).toBe('function');
    expect(typeof result.current.stop).toBe('function');
    expect(typeof result.current.replay).toBe('function');
    expect(typeof result.current.toggle).toBe('function');
  });

  it('卸载时应该清理音频（不会抛出错误）', () => {
    const { unmount } = renderHook(() => useAudioPlayer());
    unmount();
    // 确保不会抛出错误
    expect(true).toBe(true);
  });
});
