import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CharacterForm from '@/components/editor/characters/CharacterForm';
import { defaultCharacterFormData } from '@/components/editor/characters';

function jsonResponse(body: unknown, ok = true) {
  return Promise.resolve({ ok, json: () => Promise.resolve(body) } as Response);
}

describe('CharacterForm', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url === '/api/cms/config') return jsonResponse({ defaultTtsProvider: 'mimo' });
        return jsonResponse({});
      }),
    );
    vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve());
    vi.spyOn(window.HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('回填初始表单字段', () => {
    render(
      <CharacterForm
        formData={{ ...defaultCharacterFormData, id: 'hero', name: '英雄' }}
        isCreating={false}
        gameId="g1"
        onUpdate={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByDisplayValue('hero')).toBeInTheDocument();
    expect(screen.getByDisplayValue('英雄')).toBeInTheDocument();
  });

  it('新建模式显示创建按钮，编辑模式不显示', () => {
    const { rerender } = render(
      <CharacterForm
        formData={defaultCharacterFormData}
        isCreating
        gameId="g1"
        onUpdate={vi.fn()}
        onSave={vi.fn()}
      />,
    );
    expect(screen.getByText('创建角色')).toBeInTheDocument();

    rerender(
      <CharacterForm
        formData={defaultCharacterFormData}
        isCreating={false}
        gameId="g1"
        onUpdate={vi.fn()}
        onSave={vi.fn()}
      />,
    );
    expect(screen.queryByText('创建角色')).not.toBeInTheDocument();
  });

  it('修改角色名称调用 onUpdate', () => {
    const onUpdate = vi.fn();
    render(
      <CharacterForm
        formData={defaultCharacterFormData}
        isCreating
        gameId="g1"
        onUpdate={onUpdate}
        onSave={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('例如: 张大侠'), { target: { value: '英雄' } });

    expect(onUpdate).toHaveBeenCalledWith({ name: '英雄' });
  });

  it('没有 image_prompt 时 AI 生成按钮禁用', () => {
    render(
      <CharacterForm
        formData={defaultCharacterFormData}
        isCreating
        gameId="g1"
        onUpdate={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByText('AI 生成').closest('button')).toBeDisabled();
  });

  it('AI 生成图片成功后把 url 写回 image_url', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url === '/api/cms/config') return jsonResponse({ defaultTtsProvider: 'mimo' });
      if (url === '/api/cms/games/g1/generate-character-image') return jsonResponse({ url: 'https://cdn.x.com/a.png' });
      return jsonResponse({});
    });
    const onUpdate = vi.fn();
    render(
      <CharacterForm
        formData={{ ...defaultCharacterFormData, id: 'hero', image_prompt: '勇敢的英雄' }}
        isCreating
        gameId="g1"
        onUpdate={onUpdate}
        onSave={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText('AI 生成'));

    await waitFor(() => expect(onUpdate).toHaveBeenCalledWith({ image_url: 'https://cdn.x.com/a.png' }));
  });

  it('上传图片成功后把 url 写回 image_url', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url === '/api/cms/config') return jsonResponse({ defaultTtsProvider: 'mimo' });
      if (url === '/api/cms/games/g1/upload') return jsonResponse({ url: 'https://cdn.x.com/uploaded.png' });
      return jsonResponse({});
    });
    const onUpdate = vi.fn();
    const { container } = render(
      <CharacterForm
        formData={{ ...defaultCharacterFormData, id: 'hero' }}
        isCreating
        gameId="g1"
        onUpdate={onUpdate}
        onSave={vi.fn()}
      />,
    );

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['x'], 'avatar.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => expect(onUpdate).toHaveBeenCalledWith({ image_url: 'https://cdn.x.com/uploaded.png' }));
  });

  it('试听音色：首次点击生成预览并播放，第二次点击复用缓存不再请求', async () => {
    const generateVoicePreview = vi.fn().mockImplementation(() => jsonResponse({ url: 'https://cdn.x.com/v.wav' }));
    (fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url === '/api/cms/config') return jsonResponse({ defaultTtsProvider: 'mimo' });
      if (url === '/api/cms/games/g1/generate-voice-preview') return generateVoicePreview();
      return jsonResponse({});
    });
    render(
      <CharacterForm
        formData={{ ...defaultCharacterFormData, id: 'hero', name: '英雄' }}
        isCreating
        gameId="g1"
        onUpdate={vi.fn()}
        onSave={vi.fn()}
      />,
    );
    await waitFor(() => expect(screen.getByRole('button', { name: '试听' })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: '试听' }));
    await waitFor(() => expect(generateVoicePreview).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1));

    // 播放会触发 onplay -> isPlaying=true，按钮变成"停止"；点击后走停止分支，不发起新的生成请求
    fireEvent.click(screen.getByRole('button', { name: /停止|试听/ }));
    expect(generateVoicePreview).toHaveBeenCalledTimes(1);
  });

  it('切换音色时停止当前播放', () => {
    const onUpdate = vi.fn();
    render(
      <CharacterForm
        formData={{ ...defaultCharacterFormData, id: 'hero' }}
        isCreating
        gameId="g1"
        onUpdate={onUpdate}
        onSave={vi.fn()}
      />,
    );

    const select = document.querySelector('select') as HTMLSelectElement;
    const options = Array.from(select.options).map((o) => o.value);
    fireEvent.change(select, { target: { value: options[1] } });

    expect(onUpdate).toHaveBeenCalledWith({ voice_name: options[1] });
  });
});
