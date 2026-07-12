import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { type ReactNode, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AdminLayout from '@/app/(admin)/admin/layout';
import MyLayout from '@/app/(my)/my/layout';

interface SessionState {
  data: { user: { id: string; email: string } } | null;
  isPending: boolean;
}

const sessionState: SessionState = { data: null, isPending: false };

vi.mock('@/lib/auth-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth-client')>();
  return {
    ...actual,
    authClient: {
      useSession: () => ({ ...sessionState }),
    },
  };
});

const pushSpy = vi.fn();
let routerPush: (path: string) => void = pushSpy;

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: (path: string) => routerPush(path),
  }),
}));

vi.mock('@/components/my/MyNav', () => ({ default: () => null }));
vi.mock('@/components/admin/CreateGameModal', () => ({ default: () => null }));
vi.mock('@/components/admin/AdminNav', () => ({ default: () => null }));

// 模拟真实 Next.js Router：push 会触发另一个组件的 setState。
// 若被测 layout 在渲染期调用 push，React 会报
// "Cannot update a component (RouterHarness) while rendering a different component"。
function RouterHarness({ children }: { children: ReactNode }) {
  const [, setNavCount] = useState(0);
  routerPush = (path: string) => {
    pushSpy(path);
    setNavCount((c) => c + 1);
  };
  return <>{children}</>;
}

function renderWithRouter(ui: ReactNode) {
  return render(<RouterHarness>{ui}</RouterHarness>);
}

let errorSpy: ReturnType<typeof vi.spyOn>;

function expectNoRenderPhaseUpdateWarning() {
  const warnings = errorSpy.mock.calls.filter((args: unknown[]) =>
    args.some((arg: unknown) => typeof arg === 'string' && arg.includes('Cannot update a component')),
  );
  expect(warnings).toEqual([]);
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionState.data = null;
  sessionState.isPending = false;
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  errorSpy.mockRestore();
  vi.unstubAllEnvs();
});

describe('MyLayout 登录守卫', () => {
  it('未登录时跳转 /sign-in，且不在渲染期调用 router.push', async () => {
    renderWithRouter(<MyLayout>{<div>受保护内容</div>}</MyLayout>);

    await waitFor(() => expect(pushSpy).toHaveBeenCalledWith('/sign-in'));
    expect(screen.queryByText('受保护内容')).not.toBeInTheDocument();
    expectNoRenderPhaseUpdateWarning();
  });

  it('会话加载中显示加载状态，不跳转', () => {
    sessionState.isPending = true;

    renderWithRouter(<MyLayout>{<div>受保护内容</div>}</MyLayout>);

    expect(screen.getByText('加载中...')).toBeInTheDocument();
    expect(pushSpy).not.toHaveBeenCalled();
  });

  it('已登录时渲染子内容', () => {
    sessionState.data = { user: { id: 'u1', email: 'user@example.com' } };

    renderWithRouter(<MyLayout>{<div>受保护内容</div>}</MyLayout>);

    expect(screen.getByText('受保护内容')).toBeInTheDocument();
    expect(pushSpy).not.toHaveBeenCalled();
  });
});

describe('AdminLayout 权限守卫', () => {
  it('未登录时跳转 /sign-in，且不在渲染期调用 router.push', async () => {
    renderWithRouter(<AdminLayout>{<div>后台内容</div>}</AdminLayout>);

    await waitFor(() => expect(pushSpy).toHaveBeenCalledWith('/sign-in'));
    expect(screen.queryByText('后台内容')).not.toBeInTheDocument();
    expectNoRenderPhaseUpdateWarning();
  });

  it('非 root 用户跳转 /my/dashboard，且不在渲染期调用 router.push', async () => {
    vi.stubEnv('NEXT_PUBLIC_ROOT_USER_EMAIL', 'root@example.com');
    sessionState.data = { user: { id: 'u1', email: 'user@example.com' } };

    renderWithRouter(<AdminLayout>{<div>后台内容</div>}</AdminLayout>);

    await waitFor(() => expect(pushSpy).toHaveBeenCalledWith('/my/dashboard'));
    expect(screen.queryByText('后台内容')).not.toBeInTheDocument();
    expectNoRenderPhaseUpdateWarning();
  });

  it('root 用户渲染后台内容', () => {
    vi.stubEnv('NEXT_PUBLIC_ROOT_USER_EMAIL', 'root@example.com');
    sessionState.data = { user: { id: 'u1', email: 'root@example.com' } };

    renderWithRouter(<AdminLayout>{<div>后台内容</div>}</AdminLayout>);

    expect(screen.getByText('后台内容')).toBeInTheDocument();
    expect(pushSpy).not.toHaveBeenCalled();
  });
});
