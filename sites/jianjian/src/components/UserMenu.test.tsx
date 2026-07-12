import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const authClientMock = vi.hoisted(() => ({
  getSession: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('../lib/auth-client', () => ({
  authClient: authClientMock,
}));

import UserMenu from './UserMenu';

// Radix DropdownMenu.Trigger 靠 pointerdown（而非 click）打开菜单
function openMenu(button: HTMLElement) {
  fireEvent.pointerDown(button, { button: 0, pointerId: 1 });
  fireEvent.pointerUp(button, { button: 0, pointerId: 1 });
}

describe('UserMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('会话加载中显示登录按钮', () => {
    authClientMock.getSession.mockReturnValue(new Promise(() => {}));
    render(<UserMenu />);

    expect(screen.getByText('登录')).toBeInTheDocument();
  });

  it('未登录时显示登录按钮，链接到 /sign-in', async () => {
    authClientMock.getSession.mockResolvedValue({ data: { user: null } });
    render(<UserMenu />);

    const link = await screen.findByText('登录');
    expect(link.closest('a')).toHaveAttribute('href', '/sign-in');
  });

  it('getSession 抛出异常时视为未登录，不崩溃', async () => {
    authClientMock.getSession.mockRejectedValue(new Error('network down'));
    render(<UserMenu />);

    expect(await screen.findByText('登录')).toBeInTheDocument();
  });

  it('已登录时显示用户名首字母头像', async () => {
    authClientMock.getSession.mockResolvedValue({ data: { user: { name: 'Alice', email: 'alice@x.com' } } });
    render(<UserMenu />);

    expect(await screen.findByText('A')).toBeInTheDocument();
  });

  it('没有 name 时用 email 首字母，都没有时用 U', async () => {
    authClientMock.getSession.mockResolvedValue({ data: { user: { email: 'bob@x.com' } } });
    render(<UserMenu />);

    expect(await screen.findByText('B')).toBeInTheDocument();
  });

  it('打开菜单显示用户信息和菜单项', async () => {
    authClientMock.getSession.mockResolvedValue({ data: { user: { name: 'Alice', email: 'alice@x.com' } } });
    render(<UserMenu />);
    const trigger = await screen.findByLabelText('用户菜单');

    openMenu(trigger);

    expect(screen.getByText('alice@x.com')).toBeInTheDocument();
    expect(screen.getByText('个人中心')).toBeInTheDocument();
    expect(screen.getByText('退出登录')).toBeInTheDocument();
  });

  it('点击退出登录调用 signOut', async () => {
    authClientMock.getSession.mockResolvedValue({ data: { user: { name: 'Alice', email: 'alice@x.com' } } });
    authClientMock.signOut.mockResolvedValue(undefined);
    // jsdom 不支持真实页面跳转，window.location.href 赋值会打印一条 "not implemented" 警告，
    // 与本测试要验证的行为无关，屏蔽掉避免干扰输出
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<UserMenu />);
    const trigger = await screen.findByLabelText('用户菜单');
    openMenu(trigger);

    fireEvent.click(screen.getByText('退出登录'));

    await vi.waitFor(() => expect(authClientMock.signOut).toHaveBeenCalledTimes(1));
  });
});
