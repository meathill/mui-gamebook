import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AdminConfigPage from '@/app/(admin)/admin/config/page';
import type { AppConfig } from '@/lib/config';

vi.mock('@/lib/auth-client', () => ({
  authClient: {
    useSession: () => ({ data: { user: { id: 'root' } }, isPending: false }),
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

vi.mock('@phosphor-icons/react', () => ({
  FloppyDiskIcon: () => null,
  ArrowLeftIcon: () => null,
}));

const INITIAL_CONFIG: AppConfig = {
  dailyTokenLimit: 100000,
  adminUserIds: ['admin-1'],
  videoWhitelist: ['one@example.com'],
  defaultAiProvider: 'google',
  defaultTtsProvider: 'mimo',
  googleTextModel: 'google-text',
  googleImageModel: 'google-image',
  googleTtsModel: 'google-tts',
  googleVideoModel: 'google-video',
  openaiTextModel: 'openai-text',
  openaiImageModel: 'openai-image',
  openaiTtsModel: 'openai-tts',
  openaiVideoModel: 'openai-video',
  mimoTextModel: 'mimo-text',
  mimoBaseUrl: 'https://mimo.example.com/v1',
  mimoTtsModel: 'mimo-tts',
  anthropicTextModel: 'anthropic-text',
  cfAiGatewayBaseUrl: '',
};

const fetchMock = vi.fn<typeof fetch>();

describe('AdminConfigPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('保留多行字段与 Token 限制的原始草稿，dirty 时 query 更新不会覆盖', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(INITIAL_CONFIG));
    const { queryClient } = renderPage();
    const whitelist = await screen.findByPlaceholderText('每行一个邮箱地址');
    const tokenLimit = screen.getByLabelText('每日 Token 限制');

    act(() => {
      queryClient.setQueryData<AppConfig>(['admin-config'], {
        ...INITIAL_CONFIG,
        dailyTokenLimit: 750,
        videoWhitelist: ['clean-sync@example.com'],
      });
    });
    await waitFor(() => expect(tokenLimit).toHaveValue(750));
    expect(whitelist).toHaveValue('clean-sync@example.com');

    fireEvent.change(whitelist, { target: { value: ' First@Example.com \n\n second@example.com ' } });
    fireEvent.change(tokenLimit, { target: { value: '' } });

    expect(whitelist).toHaveValue(' First@Example.com \n\n second@example.com ');
    expect(tokenLimit).toHaveValue(null);

    act(() => {
      queryClient.setQueryData<AppConfig>(['admin-config'], {
        ...INITIAL_CONFIG,
        dailyTokenLimit: 500,
        videoWhitelist: ['server@example.com'],
      });
    });

    expect(whitelist).toHaveValue(' First@Example.com \n\n second@example.com ');
    expect(tokenLimit).toHaveValue(null);
  });

  it('提交时才规范化草稿，并用 PUT 返回的权威配置同步缓存和表单', async () => {
    const authoritativeConfig: AppConfig = {
      ...INITIAL_CONFIG,
      dailyTokenLimit: 25,
      adminUserIds: ['server-admin'],
      videoWhitelist: ['server@example.com'],
    };
    fetchMock
      .mockResolvedValueOnce(jsonResponse(INITIAL_CONFIG))
      .mockResolvedValueOnce(jsonResponse({ message: '配置已更新', config: authoritativeConfig }))
      .mockResolvedValueOnce(jsonResponse(INITIAL_CONFIG));
    const { queryClient } = renderPage();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    const tokenLimit = await screen.findByLabelText('每日 Token 限制');

    fireEvent.change(tokenLimit, { target: { value: '0' } });
    fireEvent.change(screen.getByPlaceholderText('每行一个邮箱地址'), {
      target: { value: ' First@Example.com \n\nsecond@example.com\nFirst@Example.com ' },
    });
    fireEvent.change(screen.getByPlaceholderText('每行一个用户 ID'), {
      target: { value: ' admin-a \n admin-a ' },
    });
    fireEvent.click(screen.getByRole('button', { name: '保存配置' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const [, request] = fetchMock.mock.calls[1];
    expect(JSON.parse(request?.body as string)).toEqual({
      ...INITIAL_CONFIG,
      dailyTokenLimit: 0,
      adminUserIds: ['admin-a', 'admin-a'],
      videoWhitelist: ['First@Example.com', 'second@example.com', 'First@Example.com'],
    });

    await waitFor(() => expect(tokenLimit).toHaveValue(25));
    expect(screen.getByPlaceholderText('每行一个邮箱地址')).toHaveValue('server@example.com');
    expect(screen.getByPlaceholderText('每行一个用户 ID')).toHaveValue('server-admin');
    expect(queryClient.getQueryData(['admin-config'])).toEqual(authoritativeConfig);
    expect(invalidateQueries).not.toHaveBeenCalled();
  });

  it('非法 Token 限制不会发请求，保存失败时保留草稿', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(INITIAL_CONFIG));
    renderPage();
    const tokenLimit = await screen.findByLabelText('每日 Token 限制');

    fireEvent.change(tokenLimit, { target: { value: '-1' } });
    fireEvent.click(screen.getByRole('button', { name: '保存配置' }));
    expect(await screen.findByText('每日 Token 限制必须是非负安全整数')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fetchMock.mockResolvedValueOnce(jsonResponse({ error: '保存失败' }, false));
    fireEvent.change(tokenLimit, { target: { value: '42' } });
    fireEvent.change(screen.getByPlaceholderText('每行一个用户 ID'), {
      target: { value: ' draft-admin \n\n draft-admin-2 ' },
    });
    fireEvent.click(screen.getByRole('button', { name: '保存配置' }));

    expect(await screen.findByText('保存失败，请重试')).toBeInTheDocument();
    expect(tokenLimit).toHaveValue(42);
    expect(screen.getByPlaceholderText('每行一个用户 ID')).toHaveValue(' draft-admin \n\n draft-admin-2 ');
  });
});

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const view = render(
    <QueryClientProvider client={queryClient}>
      <AdminConfigPage />
    </QueryClientProvider>,
  );
  return { queryClient, ...view };
}

function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    status: ok ? 200 : 500,
    json: async () => body,
  } as Response;
}
