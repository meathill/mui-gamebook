import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import IpRegistrationCard from '@/components/editor/IpRegistrationCard';

const dialogMock = {
  alert: vi.fn(),
  confirm: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
};

vi.mock('@/components/Dialog', () => ({
  useDialog: () => dialogMock,
}));

const fetchMock = vi.fn<typeof fetch>();

describe('IpRegistrationCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('加载中显示 loading 状态', () => {
    fetchMock.mockReturnValue(new Promise(() => {}));
    render(<IpRegistrationCard gameId="game-1" />);

    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });

  it('未注册时显示说明和注册按钮', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ registered: false }),
    } as Response);
    render(<IpRegistrationCard gameId="game-1" />);

    expect(await screen.findByRole('button', { name: /注册 IP 版权/ })).toBeInTheDocument();
  });

  it('已注册时显示 IP ID 和区块链浏览器链接', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          registered: true,
          ipId: '0xABC123',
          explorerUrl: 'https://explorer.story.foundation/ip/0xABC123',
        }),
    } as Response);
    render(<IpRegistrationCard gameId="game-1" />);

    expect(await screen.findByText('已注册')).toBeInTheDocument();
    expect(screen.getByText(/0xABC123/)).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /在区块链浏览器查看/ });
    expect(link).toHaveAttribute('href', 'https://explorer.story.foundation/ip/0xABC123');
  });

  it('GET 状态接口失败时不阻塞渲染，回退为未注册视图', async () => {
    fetchMock.mockResolvedValue({ ok: false } as Response);
    render(<IpRegistrationCard gameId="game-1" />);

    expect(await screen.findByRole('button', { name: /注册 IP 版权/ })).toBeInTheDocument();
  });

  it('用户取消确认时不发起注册请求', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ registered: false }),
    } as Response);
    dialogMock.confirm.mockResolvedValue(false);
    render(<IpRegistrationCard gameId="game-1" />);

    const button = await screen.findByRole('button', { name: /注册 IP 版权/ });
    fireEvent.click(button);

    await vi.waitFor(() => expect(dialogMock.confirm).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('确认注册成功后更新为已注册状态并弹出成功提示', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ registered: false }),
    } as Response);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          ipId: '0xDEF456',
          explorerUrl: 'https://explorer.story.foundation/ip/0xDEF456',
        }),
    } as Response);
    dialogMock.confirm.mockResolvedValue(true);
    render(<IpRegistrationCard gameId="game-1" />);

    const button = await screen.findByRole('button', { name: /注册 IP 版权/ });
    fireEvent.click(button);

    expect(await screen.findByText('已注册')).toBeInTheDocument();
    expect(screen.getByText(/0xDEF456/)).toBeInTheDocument();
    expect(dialogMock.success).toHaveBeenCalledWith(expect.stringContaining('注册成功'));
    expect(fetchMock).toHaveBeenLastCalledWith('/api/cms/games/game-1/register-ip', { method: 'POST' });
  });

  it('注册接口返回失败时弹出错误提示', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ registered: false }),
    } as Response);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: false, error: '链上注册失败' }),
    } as Response);
    dialogMock.confirm.mockResolvedValue(true);
    render(<IpRegistrationCard gameId="game-1" />);

    const button = await screen.findByRole('button', { name: /注册 IP 版权/ });
    fireEvent.click(button);

    await vi.waitFor(() => expect(dialogMock.error).toHaveBeenCalledWith('链上注册失败'));
  });

  it('注册请求抛出异常时弹出错误提示', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ registered: false }),
    } as Response);
    fetchMock.mockRejectedValueOnce(new Error('network down'));
    dialogMock.confirm.mockResolvedValue(true);
    render(<IpRegistrationCard gameId="game-1" />);

    const button = await screen.findByRole('button', { name: /注册 IP 版权/ });
    fireEvent.click(button);

    await vi.waitFor(() => expect(dialogMock.error).toHaveBeenCalledWith(expect.stringContaining('network down')));
  });
});
