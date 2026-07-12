import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import StoryImporter from '@/components/editor/StoryImporter';

const dialogMock = {
  alert: vi.fn(),
  confirm: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
};

vi.mock('@/components/Dialog', () => ({
  useDialog: () => dialogMock,
}));

const aiPermissionsState = {
  providers: ['mimo'] as string[],
};

vi.mock('@/lib/editor/useAiPermissions', () => ({
  AI_PROVIDER_LABELS: { mimo: 'MiMo', anthropic: 'Claude', google: 'Gemini', openai: 'GPT' },
  useAiPermissions: () => aiPermissionsState,
}));

const fetchMock = vi.fn<typeof fetch>();

function baseProps(overrides: Record<string, unknown> = {}) {
  return {
    id: 'game-1',
    onImport: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
}

describe('StoryImporter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    aiPermissionsState.providers = ['mimo'];
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('回显 initialStory，为空时生成按钮禁用', () => {
    render(<StoryImporter {...baseProps({ initialStory: '一个既有的故事' })} />);

    expect(screen.getByDisplayValue('一个既有的故事')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '生成游戏脚本' })).not.toBeDisabled();
  });

  it('没有输入故事时生成按钮禁用', () => {
    render(<StoryImporter {...baseProps()} />);

    expect(screen.getByRole('button', { name: '生成游戏脚本' })).toBeDisabled();
  });

  it('点击"使用此示例开始创作"填充文本框', () => {
    render(<StoryImporter {...baseProps()} />);

    fireEvent.click(screen.getByText('使用此示例开始创作 →'));

    const textarea = screen.getByPlaceholderText('在这里输入你的故事...') as HTMLTextAreaElement;
    expect(textarea.value.length).toBeGreaterThan(0);
  });

  it('只有一个 provider 时不显示选择器', () => {
    render(<StoryImporter {...baseProps({ initialStory: 'x' })} />);

    expect(screen.queryByTitle('选择 AI 提供者')).not.toBeInTheDocument();
  });

  it('多个 provider 时显示选择器', () => {
    aiPermissionsState.providers = ['mimo', 'anthropic'];
    render(<StoryImporter {...baseProps({ initialStory: 'x' })} />);

    expect(screen.getByTitle('选择 AI 提供者')).toBeInTheDocument();
  });

  it('点击关闭按钮触发 onClose', () => {
    const onClose = vi.fn();
    const { container } = render(<StoryImporter {...baseProps({ onClose })} />);

    // 关闭按钮只包含图标、无文本，按 DOM 顺序取第一个 button（标题栏右上角的 X）
    const closeButton = container.querySelectorAll('button')[0];
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('生成成功时依次保存草稿、调用接口、导入脚本并关闭', async () => {
    const onSaveStory = vi.fn();
    const onImport = vi.fn();
    const onClose = vi.fn();
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ script: 'title: 测试\n---\n场景内容' }),
    } as Response);
    render(<StoryImporter {...baseProps({ initialStory: '我的故事', onSaveStory, onImport, onClose })} />);

    fireEvent.click(screen.getByRole('button', { name: '生成游戏脚本' }));

    await vi.waitFor(() => expect(onImport).toHaveBeenCalledWith('title: 测试\n---\n场景内容'));
    expect(onSaveStory).toHaveBeenCalledWith('我的故事');
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/cms/games/game-1/generate-script',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ story: '我的故事', provider: 'mimo' }),
      }),
    );
  });

  it('生成失败时弹出错误提示且不关闭弹窗', async () => {
    const onClose = vi.fn();
    fetchMock.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: '生成脚本失败' }),
    } as Response);
    render(<StoryImporter {...baseProps({ initialStory: '我的故事', onClose })} />);

    fireEvent.click(screen.getByRole('button', { name: '生成游戏脚本' }));

    await vi.waitFor(() => expect(dialogMock.error).toHaveBeenCalledWith('生成脚本失败'));
    expect(onClose).not.toHaveBeenCalled();
  });
});
