import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const dialog = { confirm: vi.fn(), error: vi.fn(), success: vi.fn(), alert: vi.fn() };

vi.mock('@/components/Dialog', () => ({
  useDialog: () => dialog,
}));

import { useUsersAdmin } from '@/hooks/useUsersAdmin';
import type { UserItem } from '@/hooks/useUsersAdmin';

const fetchMock = vi.fn<typeof fetch>();

function makeUser(overrides: Partial<UserItem> = {}): UserItem {
  return {
    id: 'u1',
    name: '张三',
    email: 'zhangsan@example.com',
    emailVerified: true,
    createdAt: '2026-07-01T00:00:00.000Z',
    gameCount: 2,
    aiPermissions: null,
    ...overrides,
  };
}

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: () => Promise.resolve(body) } as Response;
}

function renderUseUsersAdmin() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return renderHook(() => useUsersAdmin(), { wrapper });
}

describe('useUsersAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue(
      jsonResponse({ users: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('初始加载时请求第一页用户列表', async () => {
    const { result } = renderUseUsersAdmin();

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(fetchMock).toHaveBeenCalledWith('/api/admin/users?page=1&limit=20');
  });

  it('handleSearch 把 searchInput 提交为 search 并重置到第一页', async () => {
    const { result } = renderUseUsersAdmin();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.setPage(3));
    act(() => result.current.setSearchInput('张三'));
    act(() => result.current.handleSearch({ preventDefault: vi.fn() } as unknown as React.FormEvent));

    expect(result.current.search).toBe('张三');
    expect(result.current.page).toBe(1);
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith('/api/admin/users?page=1&limit=20&search=%E5%BC%A0%E4%B8%89'),
    );
  });

  it('handleClearSearch 同时重置 search/searchInput/page（Phase 6 修复的清除搜索 bug）', async () => {
    const { result } = renderUseUsersAdmin();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.setSearchInput('张三'));
    act(() => result.current.handleSearch({ preventDefault: vi.fn() } as unknown as React.FormEvent));
    act(() => result.current.setPage(2));

    act(() => result.current.handleClearSearch());

    expect(result.current.search).toBe('');
    expect(result.current.searchInput).toBe('');
    expect(result.current.page).toBe(1);
  });

  describe('modal 开关与表单初始化', () => {
    it('openCreate 打开创建弹窗并清空表单', () => {
      const { result } = renderUseUsersAdmin();

      act(() => result.current.openCreate());

      expect(result.current.modalType).toBe('create');
      expect(result.current.formName).toBe('');
    });

    it('openEdit 用用户数据填充表单，并解析 aiPermissions JSON', () => {
      const { result } = renderUseUsersAdmin();
      const user = makeUser({ aiPermissions: JSON.stringify({ providers: ['google'], canGenerateImage: true }) });

      act(() => result.current.openEdit(user));

      expect(result.current.modalType).toBe('edit');
      expect(result.current.formName).toBe('张三');
      expect(result.current.formEmail).toBe('zhangsan@example.com');
      expect(result.current.formAiPermissions).toEqual({
        providers: ['google'],
        canGenerateImage: true,
        canGenerateVideo: false,
      });
    });

    it('closeModal 重置所有 modal 和表单状态', () => {
      const { result } = renderUseUsersAdmin();
      act(() => result.current.openEdit(makeUser()));

      act(() => result.current.closeModal());

      expect(result.current.modalType).toBeNull();
      expect(result.current.editingUser).toBeNull();
      expect(result.current.formName).toBe('');
    });
  });

  describe('handleCreateSubmit', () => {
    it('两次密码不一致时报错，不发起请求', () => {
      const { result } = renderUseUsersAdmin();
      act(() => result.current.openCreate());
      act(() => result.current.setFormPassword('a'));
      act(() => result.current.setFormPasswordConfirm('b'));

      act(() => result.current.handleCreateSubmit({ preventDefault: vi.fn() } as unknown as React.FormEvent));

      expect(dialog.error).toHaveBeenCalledWith('两次输入的密码不一致');
      expect(fetchMock).not.toHaveBeenCalledWith('/api/admin/users', expect.objectContaining({ method: 'POST' }));
    });

    it('成功创建后刷新列表并关闭弹窗', async () => {
      fetchMock.mockImplementation((input) => {
        if (typeof input === 'string' && input.startsWith('/api/admin/users?')) {
          return Promise.resolve(
            jsonResponse({ users: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }),
          );
        }
        return Promise.resolve(jsonResponse({ id: 'new-1' }));
      });
      const { result } = renderUseUsersAdmin();
      act(() => result.current.openCreate());
      act(() => result.current.setFormName('李四'));
      act(() => result.current.setFormEmail('lisi@example.com'));
      act(() => result.current.setFormPassword('pass123'));
      act(() => result.current.setFormPasswordConfirm('pass123'));

      act(() => result.current.handleCreateSubmit({ preventDefault: vi.fn() } as unknown as React.FormEvent));

      await waitFor(() => expect(result.current.modalType).toBeNull());
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/admin/users',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: '李四', email: 'lisi@example.com', password: 'pass123' }),
        }),
      );
    });
  });

  it('handleEditSubmit 在没有 editingUser 时不做任何事', () => {
    const { result } = renderUseUsersAdmin();

    act(() => result.current.handleEditSubmit({ preventDefault: vi.fn() } as unknown as React.FormEvent));

    expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining('/api/admin/users/'), expect.anything());
  });

  describe('handlePasswordSubmit', () => {
    it('两次密码不一致时报错', () => {
      const { result } = renderUseUsersAdmin();
      act(() => result.current.openPassword(makeUser()));
      act(() => result.current.setFormPassword('a'));
      act(() => result.current.setFormPasswordConfirm('b'));

      act(() => result.current.handlePasswordSubmit({ preventDefault: vi.fn() } as unknown as React.FormEvent));

      expect(dialog.error).toHaveBeenCalledWith('两次输入的密码不一致');
    });

    it('成功修改密码后关闭弹窗并提示成功', async () => {
      fetchMock.mockImplementation((input) => {
        if (typeof input === 'string' && input.startsWith('/api/admin/users?')) {
          return Promise.resolve(
            jsonResponse({ users: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }),
          );
        }
        return Promise.resolve(jsonResponse({ success: true }));
      });
      const { result } = renderUseUsersAdmin();
      act(() => result.current.openPassword(makeUser({ id: 'u1' })));
      act(() => result.current.setFormPassword('newpass'));
      act(() => result.current.setFormPasswordConfirm('newpass'));

      act(() => result.current.handlePasswordSubmit({ preventDefault: vi.fn() } as unknown as React.FormEvent));

      await waitFor(() => expect(dialog.success).toHaveBeenCalledWith('密码已修改'));
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/admin/users/u1/password',
        expect.objectContaining({ method: 'PUT', body: JSON.stringify({ newPassword: 'newpass' }) }),
      );
    });
  });

  describe('handleDelete', () => {
    it('用户取消确认时不发起删除请求', async () => {
      dialog.confirm.mockResolvedValue(false);
      const { result } = renderUseUsersAdmin();

      await act(async () => {
        await result.current.handleDelete(makeUser());
      });

      expect(fetchMock).not.toHaveBeenCalledWith(
        expect.stringContaining('/u1'),
        expect.objectContaining({ method: 'DELETE' }),
      );
    });

    it('确认后发起删除请求', async () => {
      dialog.confirm.mockResolvedValue(true);
      const { result } = renderUseUsersAdmin();

      await act(async () => {
        await result.current.handleDelete(makeUser({ id: 'u1' }));
      });

      expect(fetchMock).toHaveBeenCalledWith('/api/admin/users/u1', { method: 'DELETE' });
    });
  });

  it('activeMutation 根据 modalType 解析为对应的 mutation', () => {
    const { result } = renderUseUsersAdmin();

    act(() => result.current.openPassword(makeUser()));
    expect(result.current.activeMutation.isPending).toBe(false);

    act(() => result.current.openCreate());
    expect(result.current.activeMutation.isPending).toBe(false);
  });
});
