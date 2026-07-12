import { fireEvent, render, screen } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import UserDropdown from '@/components/admin/UserDropdown';
import { authClient } from '@/lib/auth-client';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

vi.mock('@/lib/auth-client', () => ({
  authClient: {
    signOut: vi.fn(),
  },
}));

// Radix DropdownMenu.Trigger 靠 pointerdown（而非 click）打开菜单
function openMenu(button: HTMLElement) {
  fireEvent.pointerDown(button, { button: 0, pointerId: 1 });
  fireEvent.pointerUp(button, { button: 0, pointerId: 1 });
}

describe('UserDropdown', () => {
  const push = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('显示邮箱 @ 前的用户名', () => {
    render(<UserDropdown email="alice@example.com" />);

    expect(screen.getByText('alice')).toBeInTheDocument();
  });

  it('打开菜单后，非管理员看不到"管理后台"选项', () => {
    render(<UserDropdown email="alice@example.com" />);

    openMenu(screen.getByRole('button'));

    expect(screen.getByText('数据统计')).toBeInTheDocument();
    expect(screen.queryByText('管理后台')).not.toBeInTheDocument();
  });

  it('isAdmin 为 true 时显示"管理后台"选项', () => {
    render(
      <UserDropdown
        email="admin@example.com"
        isAdmin
      />,
    );

    openMenu(screen.getByRole('button'));

    expect(screen.getByText('管理后台')).toBeInTheDocument();
  });

  it('点击"退出登录"依次调用 signOut 和跳转登录页', async () => {
    vi.mocked(authClient.signOut).mockResolvedValue(undefined as never);
    render(<UserDropdown email="alice@example.com" />);

    openMenu(screen.getByRole('button'));
    fireEvent.click(screen.getByText('退出登录'));

    await vi.waitFor(() => expect(push).toHaveBeenCalledWith('/sign-in'));
    expect(authClient.signOut).toHaveBeenCalledTimes(1);
  });
});
