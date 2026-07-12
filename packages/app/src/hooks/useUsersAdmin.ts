import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { parseUserAiPermissions } from '@/components/admin/UserAiPermissionsFields';
import { useDialog } from '@/components/Dialog';
import type { AiPermissions } from '@/lib/ai-permissions';

export interface UserItem {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  createdAt: string | number;
  gameCount: number;
  aiPermissions: string | null;
}

export interface UsersResponse {
  users: UserItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export type ModalType = 'create' | 'edit' | 'password' | null;

/**
 * 用户管理页的状态与操作：列表查询、分页/搜索、创建/编辑/改密/删除四个 mutation
 */
export function useUsersAdmin() {
  const queryClient = useQueryClient();
  const dialog = useDialog();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const [modalType, setModalType] = useState<ModalType>(null);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formPasswordConfirm, setFormPasswordConfirm] = useState('');
  // null = 默认权限（仅 MiMo，无生图/生视频）
  const [formAiPermissions, setFormAiPermissions] = useState<AiPermissions | null>(null);

  const { data, isLoading } = useQuery<UsersResponse>({
    queryKey: ['admin', 'users', page, search],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      const res = await fetch(`/api/admin/users?${params}`);
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (body: { name: string; email: string; password: string }) => {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error || '创建失败');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      ...body
    }: {
      id: string;
      name: string;
      email: string;
      aiPermissions: AiPermissions | null;
    }) => {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error || '更新失败');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      closeModal();
    },
  });

  const passwordMutation = useMutation({
    mutationFn: async ({ id, newPassword }: { id: string; newPassword: string }) => {
      const res = await fetch(`/api/admin/users/${id}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error || '修改密码失败');
      }
      return res.json();
    },
    onSuccess: () => {
      closeModal();
      dialog.success('密码已修改');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error || '删除失败');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });

  function closeModal() {
    setModalType(null);
    setEditingUser(null);
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setFormPasswordConfirm('');
    setFormAiPermissions(null);
  }

  function openCreate() {
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setFormPasswordConfirm('');
    setModalType('create');
  }

  function openEdit(user: UserItem) {
    setEditingUser(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormAiPermissions(parseUserAiPermissions(user.aiPermissions));
    setModalType('edit');
  }

  function openPassword(user: UserItem) {
    setEditingUser(user);
    setFormPassword('');
    setFormPasswordConfirm('');
    setModalType('password');
  }

  async function handleDelete(user: UserItem) {
    const confirmed = await dialog.confirm(`确定要删除用户「${user.name}」（${user.email}）吗？此操作无法撤销。`);
    if (!confirmed) return;
    deleteMutation.mutate(user.id);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  function handleClearSearch() {
    setSearch('');
    setSearchInput('');
    setPage(1);
  }

  function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (formPassword !== formPasswordConfirm) {
      dialog.error('两次输入的密码不一致');
      return;
    }
    createMutation.mutate({ name: formName, email: formEmail, password: formPassword });
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    updateMutation.mutate({ id: editingUser.id, name: formName, email: formEmail, aiPermissions: formAiPermissions });
  }

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    if (formPassword !== formPasswordConfirm) {
      dialog.error('两次输入的密码不一致');
      return;
    }
    passwordMutation.mutate({ id: editingUser.id, newPassword: formPassword });
  }

  const activeMutation =
    modalType === 'create' ? createMutation : modalType === 'edit' ? updateMutation : passwordMutation;

  return {
    data,
    isLoading,
    page,
    setPage,
    search,
    searchInput,
    setSearchInput,
    modalType,
    editingUser,
    formName,
    setFormName,
    formEmail,
    setFormEmail,
    formPassword,
    setFormPassword,
    formPasswordConfirm,
    setFormPasswordConfirm,
    formAiPermissions,
    setFormAiPermissions,
    activeMutation,
    closeModal,
    openCreate,
    openEdit,
    openPassword,
    handleDelete,
    handleSearch,
    handleClearSearch,
    handleCreateSubmit,
    handleEditSubmit,
    handlePasswordSubmit,
  };
}
