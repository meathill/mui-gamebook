import { fireEvent, render, screen } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const authClientMock = vi.hoisted(() => ({
  signIn: { email: vi.fn() },
}));

vi.mock('../../lib/auth-client', () => ({
  authClient: authClientMock,
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

import SignInPage from './page';

function fillForm(email: string, password: string) {
  fireEvent.change(screen.getByPlaceholderText('邮箱地址'), { target: { value: email } });
  fireEvent.change(screen.getByPlaceholderText('密码'), { target: { value: password } });
}

describe('SignInPage', () => {
  const push = vi.fn();
  const refresh = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue({ push, refresh } as unknown as ReturnType<typeof useRouter>);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('初始渲染空表单，登录按钮未处于加载态', () => {
    render(<SignInPage />);

    expect(screen.getByPlaceholderText('邮箱地址')).toHaveValue('');
    expect(screen.getByPlaceholderText('密码')).toHaveValue('');
    expect(screen.getByRole('button', { name: '登录' })).not.toBeDisabled();
  });

  it('登录成功后跳转首页并刷新', async () => {
    authClientMock.signIn.email.mockResolvedValue({ error: null });
    render(<SignInPage />);
    fillForm('alice@x.com', 'password123');

    fireEvent.click(screen.getByRole('button', { name: '登录' }));

    await vi.waitFor(() => expect(push).toHaveBeenCalledWith('/'));
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(authClientMock.signIn.email).toHaveBeenCalledWith({ email: 'alice@x.com', password: 'password123' });
  });

  it('登录失败时显示服务端返回的错误信息，不跳转', async () => {
    authClientMock.signIn.email.mockResolvedValue({ error: { message: '密码错误' } });
    render(<SignInPage />);
    fillForm('alice@x.com', 'wrong-password');

    fireEvent.click(screen.getByRole('button', { name: '登录' }));

    expect(await screen.findByText('密码错误')).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('登录失败但没有 message 字段时显示默认错误文案', async () => {
    authClientMock.signIn.email.mockResolvedValue({ error: {} });
    render(<SignInPage />);
    fillForm('alice@x.com', 'wrong-password');

    fireEvent.click(screen.getByRole('button', { name: '登录' }));

    expect(await screen.findByText('登录失败，请检查邮箱和密码')).toBeInTheDocument();
  });

  it('请求抛出异常时显示未知错误文案', async () => {
    authClientMock.signIn.email.mockRejectedValue(new Error('network down'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<SignInPage />);
    fillForm('alice@x.com', 'password123');

    fireEvent.click(screen.getByRole('button', { name: '登录' }));

    expect(await screen.findByText('发生未知错误，请稍后重试')).toBeInTheDocument();
  });

  it('提交中按钮显示"登录中..."并禁用', async () => {
    let resolveSignIn!: (value: { error: null }) => void;
    authClientMock.signIn.email.mockReturnValue(
      new Promise((resolve) => {
        resolveSignIn = resolve;
      }),
    );
    render(<SignInPage />);
    fillForm('alice@x.com', 'password123');

    fireEvent.click(screen.getByRole('button', { name: '登录' }));

    expect(await screen.findByRole('button', { name: '登录中...' })).toBeDisabled();

    resolveSignIn({ error: null });
    await vi.waitFor(() => expect(push).toHaveBeenCalled());
  });
});
