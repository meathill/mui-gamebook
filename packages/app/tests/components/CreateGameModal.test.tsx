import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CreateGameModal from '@/components/admin/CreateGameModal';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

const fetchMock = vi.fn<typeof fetch>();

function renderModal() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
  const view = render(
    <QueryClientProvider client={queryClient}>
      <CreateGameModal />
    </QueryClientProvider>,
  );
  return { ...view, invalidateQueries };
}

describe('CreateGameModal', () => {
  const push = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('点击触发按钮打开弹窗，标题为空时提交按钮禁用', () => {
    renderModal();

    fireEvent.click(screen.getByText('创建新游戏'));

    expect(screen.getByLabelText('游戏标题')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '创建' })).toBeDisabled();
  });

  it('输入标题后提交按钮可用', () => {
    renderModal();
    fireEvent.click(screen.getByText('创建新游戏'));

    fireEvent.change(screen.getByLabelText('游戏标题'), { target: { value: '迷失之城' } });

    expect(screen.getByRole('button', { name: '创建' })).not.toBeDisabled();
  });

  it('提交成功后调用接口、刷新列表并跳转到编辑页', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'game-123' }),
    } as Response);
    const { invalidateQueries } = renderModal();
    fireEvent.click(screen.getByText('创建新游戏'));
    fireEvent.change(screen.getByLabelText('游戏标题'), { target: { value: '迷失之城' } });

    fireEvent.click(screen.getByRole('button', { name: '创建' }));

    await vi.waitFor(() => expect(push).toHaveBeenCalledWith('/my/edit/game-123?showImporter=true'));
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/cms/games',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ title: '迷失之城' }),
      }),
    );
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['games'] });
    // 弹窗关闭后标题输入框应从 DOM 中消失
    expect(screen.queryByLabelText('游戏标题')).not.toBeInTheDocument();
  });

  it('提交失败时不跳转，弹窗保持打开且按钮恢复可用', async () => {
    fetchMock.mockResolvedValue({ ok: false } as Response);
    renderModal();
    fireEvent.click(screen.getByText('创建新游戏'));
    fireEvent.change(screen.getByLabelText('游戏标题'), { target: { value: '迷失之城' } });

    fireEvent.click(screen.getByRole('button', { name: '创建' }));

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(push).not.toHaveBeenCalled();
    expect(await screen.findByRole('button', { name: '创建' })).not.toBeDisabled();
    expect(screen.getByLabelText('游戏标题')).toBeInTheDocument();
  });

  it('点击取消按钮关闭弹窗', () => {
    renderModal();
    fireEvent.click(screen.getByText('创建新游戏'));

    fireEvent.click(screen.getByText('取消'));

    expect(screen.queryByLabelText('游戏标题')).not.toBeInTheDocument();
  });
});
