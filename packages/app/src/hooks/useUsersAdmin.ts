import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { parseUserAiPermissions } from '@/components/admin/UserAiPermissionsFields';
import { useDialog } from '@/components/Dialog';
import { useListQuery } from '@/hooks/useListQuery';
import type { AiPermissions } from '@/lib/ai-permissions';

export interface UserItem {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  createdAt: string | number;
  gameCount: number;
  aiPermissions: string | null;
  isAdmin: boolean;
  /** 当前有效订阅套餐码（服务端附带），未订阅为 null */
  planCode?: string | null;
  subscriptionStatus?: string | null;
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

/** 用户列表的排序键白名单（与 /api/admin/users 的 GAME_SORT_COLUMNS 对应） */
export const USER_SORT_OPTIONS = [
  { value: 'createdAt', label: '注册时间' },
  { value: 'gameCount', label: '游戏数' },
  { value: 'email', label: '邮箱' },
] as const;

export const USER_ROLE_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: 'admin', label: '管理员' },
  { value: 'user', label: '普通用户' },
] as const;

const PLAN_LABELS: Record<string, string> = {
  free: '免费档',
  basic: 'Pro',
  pro: 'Pro+',
  admin: '管理员（不限量）',
};

export function formatPlanLabel(planCode: string | null | undefined): string {
  return planCode ? (PLAN_LABELS[planCode] ?? planCode) : '免费档';
}

/**
 * 用户管理页的状态与操作：列表查询、分页/搜索/排序/筛选，四个 mutation
 */
export function useUsersAdmin() {
  const queryClient = useQueryClient();
  const dialog = useDialog();
  const list = useListQuery({
    defaultSort: 'createdAt',
    defaultOrder: 'desc',
    defaultFilters: { role: 'all' },
  });

  const [modalType, setModalType] = useState<ModalType>(null);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formPasswordConfirm, setFormPasswordConfirm] = useState('');
  // null = 跟随套餐默认权限
  const [formAiPermissions, setFormAiPermissions] = useState<AiPermissions | null>(null);
  const [formIsAdmin, setFormIsAdmin] = useState(false);

  const { data, isLoading } = useQuery<UsersResponse>({
    queryKey: ['admin', 'users', list.queryKey],
    queryFn: async () => {
      const res = await fetch(`/api/admin/users?${list.buildSearchParams()}`);
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
      isAdmin: boolean;
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
    setFormIsAdmin(false);
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
    setFormIsAdmin(user.isAdmin === true);
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
    updateMutation.mutate({
      id: editingUser.id,
      name: formName,
      email: formEmail,
      aiPermissions: formAiPermissions,
      isAdmin: formIsAdmin,
    });
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
    list,
    page: list.page,
    setPage: list.setPage,
    search: list.search,
    searchInput: list.searchInput,
    setSearchInput: list.setSearchInput,
    handleSearch: list.handleSearch,
    handleClearSearch: list.handleClearSearch,
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
    formIsAdmin,
    setFormIsAdmin,
    activeMutation,
    closeModal,
    openCreate,
    openEdit,
    openPassword,
    handleDelete,
    handleCreateSubmit,
    handleEditSubmit,
    handlePasswordSubmit,
  };
}
