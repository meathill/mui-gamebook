import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/editor/scene-metadata-edit-forms', () => ({
  EditButton: (props: { section: string; onEdit: (section: string) => void }) => (
    <button
      title="编辑"
      onClick={() => props.onEdit(props.section)}>
      编辑
    </button>
  ),
  ImageEditForm: () => <div data-testid="image-edit-form" />,
  AudioEditForm: () => <div data-testid="audio-edit-form" />,
  VideoEditForm: () => <div data-testid="video-edit-form" />,
}));

import {
  AudioSection,
  CharactersSection,
  ImageSection,
  MinigameSection,
  VideoSection,
} from '@/components/editor/scene-metadata-sections';

const commonProps = {
  editingSection: null,
  editForm: {},
  uploadUrl: '',
  onEdit: vi.fn(),
  onFieldChange: vi.fn(),
  onUploaded: vi.fn(),
  onSave: vi.fn(),
  onCancel: vi.fn(),
};

describe('ImageSection', () => {
  it('没有 image 数据时不渲染任何内容', () => {
    const { container } = render(
      <ImageSection
        {...commonProps}
        image={undefined}
        canGenerate={false}
        isGenerating={false}
        onGenerate={vi.fn()}
        onImageClick={vi.fn()}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('查看模式：展示图片和描述文字', () => {
    render(
      <ImageSection
        {...commonProps}
        image={{ url: 'https://x.com/a.png', prompt: '森林小屋' }}
        canGenerate={false}
        isGenerating={false}
        onGenerate={vi.fn()}
        onImageClick={vi.fn()}
      />,
    );

    expect(screen.getByText('森林小屋')).toBeInTheDocument();
    expect(screen.queryByTestId('image-edit-form')).not.toBeInTheDocument();
  });

  it('编辑模式：渲染 ImageEditForm 而不是查看态', () => {
    render(
      <ImageSection
        {...commonProps}
        editingSection="image"
        image={{ prompt: '森林小屋' }}
        canGenerate={false}
        isGenerating={false}
        onGenerate={vi.fn()}
        onImageClick={vi.fn()}
      />,
    );

    expect(screen.getByTestId('image-edit-form')).toBeInTheDocument();
    expect(screen.queryByTitle('编辑')).not.toBeInTheDocument();
  });

  it('点击编辑按钮调用 onEdit("image")', () => {
    const onEdit = vi.fn();
    render(
      <ImageSection
        {...commonProps}
        onEdit={onEdit}
        image={{ prompt: 'x' }}
        canGenerate={false}
        isGenerating={false}
        onGenerate={vi.fn()}
        onImageClick={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTitle('编辑'));

    expect(onEdit).toHaveBeenCalledWith('image');
  });
});

describe('AudioSection', () => {
  it('没有 audio 数据时不渲染', () => {
    const { container } = render(
      <AudioSection
        {...commonProps}
        audio={undefined}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('按 type 显示对应的中文标签', () => {
    const { rerender } = render(
      <AudioSection
        {...commonProps}
        audio={{ type: 'sfx', prompt: 'x' }}
      />,
    );
    expect(screen.getByText('音效')).toBeInTheDocument();

    rerender(
      <AudioSection
        {...commonProps}
        audio={{ type: 'background_music', prompt: 'x' }}
      />,
    );
    expect(screen.getByText('背景音乐')).toBeInTheDocument();
  });

  it('未知 type 时回退显示"音频"', () => {
    render(
      <AudioSection
        {...commonProps}
        audio={{ prompt: 'x' }}
      />,
    );

    expect(screen.getByText('音频')).toBeInTheDocument();
  });
});

describe('VideoSection', () => {
  it('没有 video 数据时不渲染', () => {
    const { container } = render(
      <VideoSection
        {...commonProps}
        video={undefined}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('编辑态渲染 VideoEditForm', () => {
    render(
      <VideoSection
        {...commonProps}
        editingSection="video"
        video={{ prompt: 'x' }}
      />,
    );

    expect(screen.getByTestId('video-edit-form')).toBeInTheDocument();
  });
});

describe('MinigameSection', () => {
  it('没有 minigame 数据时不渲染', () => {
    const { container } = render(
      <MinigameSection
        {...commonProps}
        minigame={undefined}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('编辑态显示表单字段并保存/取消', () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    render(
      <MinigameSection
        {...commonProps}
        editingSection="minigame"
        minigame={{ prompt: 'x' }}
        onSave={onSave}
        onCancel={onCancel}
      />,
    );

    fireEvent.click(screen.getByText('保存'));
    fireEvent.click(screen.getByText('取消'));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

describe('CharactersSection', () => {
  it('没有角色或空数组时不渲染', () => {
    const { container: c1 } = render(
      <CharactersSection
        {...commonProps}
        characters={undefined}
      />,
    );
    expect(c1).toBeEmptyDOMElement();

    const { container: c2 } = render(
      <CharactersSection
        {...commonProps}
        characters={[]}
      />,
    );
    expect(c2).toBeEmptyDOMElement();
  });

  it('查看态列出所有角色标签', () => {
    render(
      <CharactersSection
        {...commonProps}
        characters={['hero', 'villain']}
      />,
    );

    expect(screen.getByText('hero')).toBeInTheDocument();
    expect(screen.getByText('villain')).toBeInTheDocument();
  });

  it('编辑态显示逗号分隔的输入框', () => {
    render(
      <CharactersSection
        {...commonProps}
        editingSection="characters"
        characters={['hero']}
        editForm={{ characters: 'hero, villain' }}
      />,
    );

    expect(screen.getByDisplayValue('hero, villain')).toBeInTheDocument();
  });
});
