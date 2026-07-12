import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import MediaPreview from '@/components/editor/MediaAssetItem/MediaPreview';

function baseProps(
  overrides: Partial<{ isImage: boolean; isAudio: boolean; isVideo: boolean; isMinigame: boolean; isPending: boolean }>,
) {
  return {
    url: 'https://cdn.x.com/a',
    isImage: false,
    isAudio: false,
    isVideo: false,
    isMinigame: false,
    isPending: false,
    ...overrides,
  };
}

describe('MediaPreview', () => {
  it('isPending 时优先显示生成中状态，忽略类型', () => {
    render(<MediaPreview {...baseProps({ isImage: true, isPending: true })} />);

    expect(screen.getByText('生成中...')).toBeInTheDocument();
    expect(document.querySelector('img')).not.toBeInTheDocument();
  });

  it('isImage 时渲染缩略图，点击后打开大图弹窗', () => {
    render(<MediaPreview {...baseProps({ isImage: true })} />);

    expect(screen.getByAltText('预览')).toHaveAttribute('src', 'https://cdn.x.com/a');
    expect(screen.queryByAltText('完整预览')).not.toBeInTheDocument();

    fireEvent.click(screen.getByAltText('预览').parentElement!);

    expect(screen.getByAltText('完整预览')).toBeInTheDocument();
  });

  it('isAudio 时渲染 audio 元素', () => {
    render(<MediaPreview {...baseProps({ isAudio: true })} />);

    expect(document.querySelector('audio')).toHaveAttribute('src', 'https://cdn.x.com/a');
  });

  it('isVideo 时渲染 video 元素', () => {
    render(<MediaPreview {...baseProps({ isVideo: true })} />);

    expect(document.querySelector('video')).toHaveAttribute('src', 'https://cdn.x.com/a');
  });

  it('isMinigame 时显示"小游戏已生成"提示，不渲染 url 相关内容', () => {
    render(<MediaPreview {...baseProps({ isMinigame: true })} />);

    expect(screen.getByText('小游戏已生成')).toBeInTheDocument();
  });

  it('都不是时不渲染任何内容', () => {
    const { container } = render(<MediaPreview {...baseProps({})} />);

    expect(container).toBeEmptyDOMElement();
  });
});
