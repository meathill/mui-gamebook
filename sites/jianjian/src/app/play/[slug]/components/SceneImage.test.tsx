import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SceneImage from './SceneImage';

describe('SceneImage', () => {
  it('渲染图片 url 和 alt 文字', () => {
    render(
      <SceneImage
        url="https://x.com/scene.png"
        loading={false}
        onLoad={vi.fn()}
      />,
    );

    const img = screen.getByAltText('场景图片');
    expect(img).toHaveAttribute('src', 'https://x.com/scene.png');
  });

  it('loading 时降低不透明度，加载完成后恢复', () => {
    const { rerender } = render(
      <SceneImage
        url="https://x.com/scene.png"
        loading={true}
        onLoad={vi.fn()}
      />,
    );
    expect(screen.getByAltText('场景图片')).toHaveClass('opacity-50');

    rerender(
      <SceneImage
        url="https://x.com/scene.png"
        loading={false}
        onLoad={vi.fn()}
      />,
    );
    expect(screen.getByAltText('场景图片')).toHaveClass('opacity-100');
  });

  it('图片加载完成时触发 onLoad', () => {
    const onLoad = vi.fn();
    render(
      <SceneImage
        url="https://x.com/scene.png"
        loading={true}
        onLoad={onLoad}
      />,
    );

    fireEvent.load(screen.getByAltText('场景图片'));

    expect(onLoad).toHaveBeenCalledTimes(1);
  });
});
