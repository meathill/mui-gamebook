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
  /** 累计计费 token（按模型定价折算的核算 token） */
  totalTokens: number;
  /** 累计图片/视频/音频生成次数 */
  imageCount: number;
  videoCount: number;
  audioCount: number;
  aiPermissions: string | null;
  isAdmin: boolean;
  /** 封禁标记与原因（封禁后无法登录） */
  banned: boolean;
  banReason: string | null;
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

export type ModalType = 'create' | 'edit' | 'ban' | null;

/** 用户列表的排序键白名单（与 /api/admin/users 的 USER_SORT_COLUMNS 对应） */
export const USER_SORT_OPTIONS = [
  { value: 'createdAt', label: '注册时间' },
  { value: 'gameCount', label: '游戏数' },
  { value: 'email', label: '邮箱' },
  { value: 'totalTokens', label: 'AI Token' },
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
  // 封禁表单：原因 + 是否同时下架其全部已发布作品（NSFW 处置默认勾选）
  const [formBanReason, setFormBanReason] = useState('');
  const [formShadowBanGames, setFormShadowBanGames] = useState(true);

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

  const banMutation = useMutation({
    mutationFn: async ({
      id,
      banned,
      banReason,
      shadowBanGames,
    }: {
      id: string;
      banned: boolean;
      banReason?: string;
      shadowBanGames?: boolean;
    }) => {
      const res = await fetch(`/api/admin/users/${id}/ban`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ banned, banReason, shadowBanGames }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error || (banned ? '封禁失败' : '解封失败'));
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      closeModal();
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      dialog.success(variables.banned ? '已封禁，该用户全部登录状态已失效' : '已解封');
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

  function openBan(user: UserItem) {
    setEditingUser(user);
    setFormBanReason('');
    setFormShadowBanGames(true);
    setModalType('ban');
  }

  async function handleUnban(user: UserItem) {
    const confirmed = await dialog.confirm(`确定解封「${user.name}」（${user.email}）吗？其作品需另行手动解封。`);
    if (!confirmed) return;
    banMutation.mutate({ id: user.id, banned: false });
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

  function handleBanSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    banMutation.mutate({
      id: editingUser.id,
      banned: true,
      banReason: formBanReason || undefined,
      shadowBanGames: formShadowBanGames,
    });
  }

  const activeMutation = modalType === 'create' ? createMutation : modalType === 'edit' ? updateMutation : banMutation;

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
    formBanReason,
    setFormBanReason,
    formShadowBanGames,
    setFormShadowBanGames,
    activeMutation,
    closeModal,
    openCreate,
    openEdit,
    openBan,
    handleUnban,
    handleDelete,
    handleCreateSubmit,
    handleEditSubmit,
    handleBanSubmit,
  };
}
