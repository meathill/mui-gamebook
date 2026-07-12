import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ImmersiveBackground from '@/components/game-player/ImmersiveBackground';

describe('ImmersiveBackground', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('没有 url 时只渲染黑色背景', () => {
    const { container } = render(<ImmersiveBackground />);

    expect(container.querySelectorAll('img')).toHaveLength(0);
    expect(container.querySelector('.bg-black')).toBeInTheDocument();
  });

  it('初始传入 url 时渲染当前图（模糊层+清晰层），没有旧图', () => {
    const { container } = render(<ImmersiveBackground url="https://x.com/a.png" />);

    const images = container.querySelectorAll('img');
    expect(images).toHaveLength(2);
    for (const img of images) {
      expect(img).toHaveAttribute('src', expect.stringContaining('a.png'));
    }
  });

  it('url 切换后旧图保留在底层，300ms 后淡出并清除', () => {
    const { container, rerender } = render(<ImmersiveBackground url="https://x.com/a.png" />);

    rerender(<ImmersiveBackground url="https://x.com/b.png" />);

    // 切换瞬间：旧图 2 张 + 新图 2 张 = 4 张
    expect(container.querySelectorAll('img')).toHaveLength(4);

    act(() => {
      vi.advanceTimersByTime(300);
    });

    // 淡出计时结束后旧图被移除，只剩新图 2 张
    expect(container.querySelectorAll('img')).toHaveLength(2);
    for (const img of container.querySelectorAll('img')) {
      expect(img).toHaveAttribute('src', expect.stringContaining('b.png'));
    }
  });

  it('相同 url 重复传入不会触发切换效果', () => {
    const { container, rerender } = render(<ImmersiveBackground url="https://x.com/a.png" />);

    rerender(<ImmersiveBackground url="https://x.com/a.png" />);

    expect(container.querySelectorAll('img')).toHaveLength(2);
  });

  it('卸载时清理定时器，不会抛出异常', () => {
    const { unmount, rerender } = render(<ImmersiveBackground url="https://x.com/a.png" />);
    rerender(<ImmersiveBackground url="https://x.com/b.png" />);

    expect(() => unmount()).not.toThrow();
  });
});
