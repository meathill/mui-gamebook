import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTypewriter } from '../../src/components/game-player/hooks/useTypewriter';

describe('useTypewriter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('逐字显示文本，最终 isComplete 为 true', () => {
    const { result } = renderHook(() => useTypewriter('abc', 10));

    expect(result.current.displayed).toBe('');
    expect(result.current.isComplete).toBe(false);

    act(() => vi.advanceTimersByTime(10));
    expect(result.current.displayed).toBe('a');

    act(() => vi.advanceTimersByTime(10));
    expect(result.current.displayed).toBe('ab');

    act(() => vi.advanceTimersByTime(10));
    expect(result.current.displayed).toBe('abc');

    // 完成标记要在最后一个字符显示后，再多一步 tick 才会置位
    act(() => vi.advanceTimersByTime(10));
    expect(result.current.isComplete).toBe(true);
  });

  it('onTick 在逐字输出的每一步都触发一次', () => {
    const onTick = vi.fn();
    renderHook(() => useTypewriter('abc', 10, onTick));

    act(() => vi.advanceTimersByTime(30));

    expect(onTick).toHaveBeenCalledTimes(3);
  });

  it('complete() 立即显示全文，且不触发 onTick', () => {
    const onTick = vi.fn();
    const { result } = renderHook(() => useTypewriter('abc', 10, onTick));

    act(() => result.current.complete());

    expect(result.current.displayed).toBe('abc');
    expect(result.current.isComplete).toBe(true);
    expect(onTick).not.toHaveBeenCalled();

    // complete() 之后不应再有残留的定时器继续推进
    act(() => vi.advanceTimersByTime(100));
    expect(result.current.displayed).toBe('abc');
  });

  it('reset() 清空已显示内容并重新开始', () => {
    const { result } = renderHook(() => useTypewriter('abc', 10));
    act(() => vi.advanceTimersByTime(20));
    expect(result.current.displayed).toBe('ab');

    act(() => result.current.reset());

    expect(result.current.displayed).toBe('');
    expect(result.current.isComplete).toBe(false);
  });

  it('text 变化时自动重置并开始输出新文本', () => {
    const { result, rerender } = renderHook(({ text }) => useTypewriter(text, 10), { initialProps: { text: 'abc' } });
    act(() => vi.advanceTimersByTime(40));
    expect(result.current.displayed).toBe('abc');
    expect(result.current.isComplete).toBe(true);

    rerender({ text: 'xyz' });

    expect(result.current.displayed).toBe('');
    expect(result.current.isComplete).toBe(false);

    act(() => vi.advanceTimersByTime(40));
    expect(result.current.displayed).toBe('xyz');
    expect(result.current.isComplete).toBe(true);
  });

  it('空文本立即视为已完成', () => {
    const { result } = renderHook(() => useTypewriter('', 10));

    expect(result.current.displayed).toBe('');
    expect(result.current.isComplete).toBe(true);
  });
});
