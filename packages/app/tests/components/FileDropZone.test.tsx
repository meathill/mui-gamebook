import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FileDropZone from '@/components/editor/FileDropZone';

function baseProps(overrides: Record<string, unknown> = {}) {
  return {
    uploadUrl: '/api/upload',
    assetType: 'scene' as const,
    accept: 'image/*',
    onUploaded: vi.fn(),
    ...overrides,
  };
}

const fetchMock = vi.fn<typeof fetch>();

describe('FileDropZone', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('默认显示提示文字，可通过 hint 自定义', () => {
    const { rerender } = render(<FileDropZone {...baseProps()} />);
    expect(screen.getByText('点击或拖拽文件上传')).toBeInTheDocument();

    rerender(<FileDropZone {...baseProps({ hint: '上传场景图片' })} />);
    expect(screen.getByText('上传场景图片')).toBeInTheDocument();
  });

  it('拖拽文件触发上传，成功后调用 onUploaded', async () => {
    const onUploaded = vi.fn();
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ url: 'https://cdn.x.com/a.png' }),
    } as Response);
    const { container } = render(<FileDropZone {...baseProps({ onUploaded })} />);

    const file = new File(['x'], 'a.png', { type: 'image/png' });
    const dropzone = container.querySelector('.smc-dropzone')!;
    fireEvent.drop(dropzone, { dataTransfer: { files: [file] } });

    expect(await screen.findByText('点击或拖拽文件上传')).toBeInTheDocument();
    expect(onUploaded).toHaveBeenCalledWith('https://cdn.x.com/a.png');
    expect(fetchMock).toHaveBeenCalledWith('/api/upload', expect.objectContaining({ method: 'POST' }));
  });

  it('通过隐藏 input 选择文件也能触发上传', async () => {
    const onUploaded = vi.fn();
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ url: 'https://cdn.x.com/b.png' }),
    } as Response);
    const { container } = render(<FileDropZone {...baseProps({ onUploaded })} />);

    const file = new File(['x'], 'b.png', { type: 'image/png' });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await vi.waitFor(() => expect(onUploaded).toHaveBeenCalledWith('https://cdn.x.com/b.png'));
    expect(input.value).toBe('');
  });

  it('上传失败时显示错误信息', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: '服务器错误' }),
    } as Response);
    const { container } = render(<FileDropZone {...baseProps()} />);

    const file = new File(['x'], 'a.png', { type: 'image/png' });
    const dropzone = container.querySelector('.smc-dropzone')!;
    fireEvent.drop(dropzone, { dataTransfer: { files: [file] } });

    expect(await screen.findByText('服务器错误')).toBeInTheDocument();
  });

  it('拖拽经过和离开切换 active 样式', () => {
    const { container } = render(<FileDropZone {...baseProps()} />);
    const dropzone = container.querySelector('.smc-dropzone')!;

    expect(dropzone).not.toHaveClass('smc-dropzone-active');
    fireEvent.dragOver(dropzone);
    expect(dropzone).toHaveClass('smc-dropzone-active');
    fireEvent.dragLeave(dropzone);
    expect(dropzone).not.toHaveClass('smc-dropzone-active');
  });
});
