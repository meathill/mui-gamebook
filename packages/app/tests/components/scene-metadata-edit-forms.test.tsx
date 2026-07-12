import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/editor/FileDropZone', () => ({
  default: (props: { hint: string; onUploaded: (url: string) => void }) => (
    <button
      data-testid="file-drop-zone"
      onClick={() => props.onUploaded('https://cdn.x.com/dropped.png')}>
      {props.hint}
    </button>
  ),
}));

import { AudioEditForm, EditButton, ImageEditForm, VideoEditForm } from '@/components/editor/scene-metadata-edit-forms';

const noopForm = {
  editForm: {},
  uploadUrl: '',
  onFieldChange: vi.fn(),
  onUploaded: vi.fn(),
  onSave: vi.fn(),
  onCancel: vi.fn(),
};

describe('EditButton', () => {
  it('点击时调用 onEdit 并传入对应 section', () => {
    const onEdit = vi.fn();
    render(
      <EditButton
        section="image"
        onEdit={onEdit}
      />,
    );

    fireEvent.click(screen.getByTitle('编辑'));

    expect(onEdit).toHaveBeenCalledWith('image');
  });
});

describe('ImageEditForm', () => {
  it('没有 canGenerate 时不显示 AI 生成按钮', () => {
    render(
      <ImageEditForm
        {...noopForm}
        canGenerate={false}
        isGenerating={false}
        onGenerate={vi.fn()}
        onImageClick={vi.fn()}
      />,
    );

    expect(screen.queryByText('生成图片')).not.toBeInTheDocument();
  });

  it('有 prompt 时才能点击生成，已有 url 时按钮文案变为"重新生成"', () => {
    const { rerender } = render(
      <ImageEditForm
        {...noopForm}
        canGenerate
        isGenerating={false}
        onGenerate={vi.fn()}
        onImageClick={vi.fn()}
      />,
    );
    expect(screen.getByText('生成图片').closest('button')).toBeDisabled();

    rerender(
      <ImageEditForm
        {...noopForm}
        editForm={{ prompt: '森林小屋', url: 'https://x.com/a.png' }}
        canGenerate
        isGenerating={false}
        onGenerate={vi.fn()}
        onImageClick={vi.fn()}
      />,
    );
    expect(screen.getByText('重新生成').closest('button')).not.toBeDisabled();
  });

  it('生成中时按钮禁用并显示"生成中..."', () => {
    render(
      <ImageEditForm
        {...noopForm}
        editForm={{ prompt: '森林小屋' }}
        canGenerate
        isGenerating
        onGenerate={vi.fn()}
        onImageClick={vi.fn()}
      />,
    );

    expect(screen.getByText('生成中...').closest('button')).toBeDisabled();
  });

  it('点击已有图片触发 onImageClick', () => {
    const onImageClick = vi.fn();
    render(
      <ImageEditForm
        {...noopForm}
        editForm={{ url: 'https://x.com/a.png' }}
        canGenerate={false}
        isGenerating={false}
        onGenerate={vi.fn()}
        onImageClick={onImageClick}
      />,
    );

    fireEvent.click(screen.getByAltText('当前图片'));

    expect(onImageClick).toHaveBeenCalledWith('https://x.com/a.png');
  });

  it('配置了 uploadUrl 时显示上传区域，上传成功调用 onUploaded', () => {
    const onUploaded = vi.fn();
    render(
      <ImageEditForm
        {...noopForm}
        uploadUrl="https://x.com/upload"
        onUploaded={onUploaded}
        canGenerate={false}
        isGenerating={false}
        onGenerate={vi.fn()}
        onImageClick={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId('file-drop-zone'));

    expect(onUploaded).toHaveBeenCalledWith('https://cdn.x.com/dropped.png');
  });
});

describe('AudioEditForm', () => {
  it('没有 url 时不渲染 audio 元素', () => {
    render(<AudioEditForm {...noopForm} />);

    expect(document.querySelector('audio')).not.toBeInTheDocument();
  });

  it('有 url 时渲染 audio 元素', () => {
    render(
      <AudioEditForm
        {...noopForm}
        editForm={{ url: 'https://x.com/a.wav' }}
      />,
    );

    expect(document.querySelector('audio')).toHaveAttribute('src', 'https://x.com/a.wav');
  });

  it('切换音频类型调用 onFieldChange', () => {
    const onFieldChange = vi.fn();
    render(
      <AudioEditForm
        {...noopForm}
        onFieldChange={onFieldChange}
      />,
    );

    fireEvent.change(screen.getByDisplayValue('背景音乐'), { target: { value: 'sfx' } });

    expect(onFieldChange).toHaveBeenCalledWith('type', 'sfx');
  });
});

describe('VideoEditForm', () => {
  it('有 url 时渲染 video 元素', () => {
    render(
      <VideoEditForm
        {...noopForm}
        editForm={{ url: 'https://x.com/a.mp4' }}
      />,
    );

    expect(document.querySelector('video')).toHaveAttribute('src', 'https://x.com/a.mp4');
  });

  it('修改视频描述调用 onFieldChange', () => {
    const onFieldChange = vi.fn();
    render(
      <VideoEditForm
        {...noopForm}
        onFieldChange={onFieldChange}
      />,
    );

    fireEvent.change(screen.getByText('视频描述').parentElement!.querySelector('textarea')!, {
      target: { value: '新描述' },
    });

    expect(onFieldChange).toHaveBeenCalledWith('prompt', '新描述');
  });
});
