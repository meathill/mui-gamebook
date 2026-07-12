import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import TypeIcon from '@/components/editor/MediaAssetItem/TypeIcon';

function baseProps(overrides: Partial<{ isImage: boolean; isAudio: boolean; isVideo: boolean; isMinigame: boolean }>) {
  return { isImage: false, isAudio: false, isVideo: false, isMinigame: false, size: 16, ...overrides };
}

describe('TypeIcon', () => {
  it('按类型渲染不同的图标（用 svg 内容区分，而不是组件名）', () => {
    const { container: image } = render(<TypeIcon {...baseProps({ isImage: true })} />);
    const { container: audio } = render(<TypeIcon {...baseProps({ isAudio: true })} />);
    const { container: video } = render(<TypeIcon {...baseProps({ isVideo: true })} />);
    const { container: minigame } = render(<TypeIcon {...baseProps({ isMinigame: true })} />);

    const paths = [image, audio, video, minigame].map((c) => c.querySelector('svg path')?.getAttribute('d'));
    // 四种类型应该各自渲染出不同的图标路径
    expect(new Set(paths).size).toBe(4);
  });

  it('都不匹配时回退到图片图标', () => {
    const { container: fallback } = render(<TypeIcon {...baseProps({})} />);
    const { container: image } = render(<TypeIcon {...baseProps({ isImage: true })} />);

    expect(fallback.querySelector('svg path')?.getAttribute('d')).toBe(
      image.querySelector('svg path')?.getAttribute('d'),
    );
  });

  it('小游戏图标使用紫色样式，其余用灰色', () => {
    const { container: minigame } = render(<TypeIcon {...baseProps({ isMinigame: true })} />);
    const { container: image } = render(<TypeIcon {...baseProps({ isImage: true })} />);

    expect(minigame.querySelector('svg')).toHaveClass('text-purple-500');
    expect(image.querySelector('svg')).toHaveClass('text-gray-400');
  });
});
