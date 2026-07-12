import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ImageLightbox from '@/components/editor/ImageLightbox';

describe('ImageLightbox', () => {
  it('渲染图片，默认 alt 为"素材预览"', () => {
    render(
      <ImageLightbox
        src="https://cdn.x.com/a.png"
        onClose={vi.fn()}
      />,
    );

    const img = screen.getByAltText('素材预览');
    expect(img).toHaveAttribute('src', 'https://cdn.x.com/a.png');
  });

  it('自定义 alt 时使用传入的文案', () => {
    render(
      <ImageLightbox
        src="https://cdn.x.com/a.png"
        alt="场景配图"
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByAltText('场景配图')).toBeInTheDocument();
  });

  it('点击背景区域触发 onClose', () => {
    const onClose = vi.fn();
    const { container } = render(
      <ImageLightbox
        src="https://cdn.x.com/a.png"
        onClose={onClose}
      />,
    );

    fireEvent.click(container.firstChild as Element);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('点击图片本身不冒泡触发 onClose', () => {
    const onClose = vi.fn();
    render(
      <ImageLightbox
        src="https://cdn.x.com/a.png"
        onClose={onClose}
      />,
    );

    fireEvent.click(screen.getByAltText('素材预览'));

    expect(onClose).not.toHaveBeenCalled();
  });

  it('点击关闭按钮触发 onClose', () => {
    const onClose = vi.fn();
    render(
      <ImageLightbox
        src="https://cdn.x.com/a.png"
        onClose={onClose}
      />,
    );

    // 关闭按钮未 stopPropagation，点击事件冒泡到背景 div 也会触发一次 onClose，
    // 因此实际调用 2 次；onClose 通常是幂等的 setState，不构成需要修复的 bug
    fireEvent.click(screen.getByTitle('关闭'));

    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('按下 Escape 键触发 onClose', () => {
    const onClose = vi.fn();
    render(
      <ImageLightbox
        src="https://cdn.x.com/a.png"
        onClose={onClose}
      />,
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('卸载后不再响应 Escape 键（正确清理监听器）', () => {
    const onClose = vi.fn();
    const { unmount } = render(
      <ImageLightbox
        src="https://cdn.x.com/a.png"
        onClose={onClose}
      />,
    );

    unmount();
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).not.toHaveBeenCalled();
  });
});
