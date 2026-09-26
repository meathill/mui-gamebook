import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ImmersiveBackground from '@/components/game-player/ImmersiveBackground';

// next/image 在 jsdom 里不触发 load 事件，mock 成普通 img 只测本组件的状态机
vi.mock('next/image', () => ({
  default: ({ fill, priority, ...rest }: Record<string, unknown>) => {
    void fill;
    void priority;
    // eslint-disable-next-line jsx-a11y/alt-text
    return <img {...rest} />;
  },
}));

describe('ImmersiveBackground', () => {
  it('无 url 时纯黑屏', () => {
    const { container } = render(<ImmersiveBackground url={undefined} />);

    expect(container.querySelector('img')).not.toBeInTheDocument();
    expect(container.firstChild).toHaveClass('bg-black');
  });

  it('新图加载完成前不展示旧图，只黑屏 + 隐藏预加载层', () => {
    render(<ImmersiveBackground url="https://example.com/a.png" />);

    // 可见插画未出现，预加载层（空 alt）在 DOM 里请图
    expect(screen.queryByAltText('场景插画')).not.toBeInTheDocument();
    expect(screen.getAllByAltText('')).toHaveLength(1);
  });

  it('预加载 onLoad 后点亮可见双层', () => {
    render(<ImmersiveBackground url="https://example.com/a.png" />);

    fireEvent.load(screen.getAllByAltText('')[0]);

    expect(screen.getByAltText('场景插画')).toBeInTheDocument();
  });

  it('切换 url 时旧图立即卸载回到黑屏，新图请好后才展示', () => {
    const { rerender } = render(<ImmersiveBackground url="https://example.com/a.png" />);
    fireEvent.load(screen.getAllByAltText('')[0]);
    expect(screen.getByAltText('场景插画')).toBeInTheDocument();

    rerender(<ImmersiveBackground url="https://example.com/b.png" />);

    // 旧图（a.png）已卸载：没有可见插画，也没有指向 a 的 img
    expect(screen.queryByAltText('场景插画')).not.toBeInTheDocument();
    expect(document.querySelector('img[src*="a.png"]')).toBeNull();

    fireEvent.load(screen.getAllByAltText('')[0]);
    expect(screen.getByAltText('场景插画')).toBeInTheDocument();
    expect(document.querySelector('img[src*="b.png"]')).not.toBeNull();
  });

  it('加载失败时保持黑屏', () => {
    const { container } = render(<ImmersiveBackground url="https://example.com/broken.png" />);
    fireEvent.error(screen.getAllByAltText('')[0]);

    expect(container.querySelector('img')).not.toBeInTheDocument();
  });
});
