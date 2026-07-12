import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/editor/MentionInput', () => ({
  default: (props: { value: string; onChange: (v: string) => void; placeholder?: string }) => (
    <textarea
      data-testid="mention-input"
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
      placeholder={props.placeholder}
    />
  ),
}));

import MediaGenerator from '@/components/editor/MediaAssetItem/MediaGenerator';

const aspectRatios = [
  { value: '1:1', label: '正方形' },
  { value: '16:9', label: '宽屏' },
];

function baseProps(overrides: Record<string, unknown> = {}) {
  return {
    prompt: '',
    aspectRatio: '1:1',
    isImage: true,
    isGenerating: false,
    aspectRatios,
    onPromptChange: vi.fn(),
    onAspectRatioChange: vi.fn(),
    onGenerate: vi.fn(),
    ...overrides,
  };
}

describe('MediaGenerator', () => {
  it('没有角色时渲染普通 textarea，有角色时渲染 MentionInput', () => {
    const { rerender } = render(<MediaGenerator {...baseProps()} />);
    expect(screen.queryByTestId('mention-input')).not.toBeInTheDocument();

    rerender(<MediaGenerator {...baseProps({ characters: { hero: { name: '英雄' } } })} />);
    expect(screen.getByTestId('mention-input')).toBeInTheDocument();
  });

  it('isImage 时显示比例选择，非图片类型不显示', () => {
    const { rerender } = render(<MediaGenerator {...baseProps({ isImage: true })} />);
    expect(screen.getByText('比例:')).toBeInTheDocument();

    rerender(<MediaGenerator {...baseProps({ isImage: false })} />);
    expect(screen.queryByText('比例:')).not.toBeInTheDocument();
  });

  it('没有 prompt 时生成按钮禁用', () => {
    render(<MediaGenerator {...baseProps({ prompt: '' })} />);

    expect(screen.getByTitle('生成素材')).toBeDisabled();
  });

  it('有 prompt 且未在生成中时可以点击生成', () => {
    const onGenerate = vi.fn();
    render(<MediaGenerator {...baseProps({ prompt: '森林小屋', onGenerate })} />);

    fireEvent.click(screen.getByTitle('生成素材'));

    expect(onGenerate).toHaveBeenCalledTimes(1);
  });

  it('生成中时按钮禁用', () => {
    render(<MediaGenerator {...baseProps({ prompt: '森林小屋', isGenerating: true })} />);

    expect(screen.getByTitle('生成素材')).toBeDisabled();
  });

  it('featured 模式渲染"生成"文字按钮而不是紧凑图标按钮', () => {
    render(<MediaGenerator {...baseProps({ variant: 'featured', prompt: 'x' })} />);

    expect(screen.getByText('生成')).toBeInTheDocument();
    expect(screen.queryByTitle('生成素材')).not.toBeInTheDocument();
  });

  it('修改比例调用 onAspectRatioChange', () => {
    const onAspectRatioChange = vi.fn();
    render(<MediaGenerator {...baseProps({ onAspectRatioChange })} />);

    fireEvent.change(screen.getByDisplayValue('正方形'), { target: { value: '16:9' } });

    expect(onAspectRatioChange).toHaveBeenCalledWith('16:9');
  });
});
