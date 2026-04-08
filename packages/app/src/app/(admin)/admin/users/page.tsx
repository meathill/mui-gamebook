'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Dialog from '@radix-ui/react-dialog';
import { Plus, Pencil, Key, Trash2, Search, X } from 'lucide-react';
import { useDialog } from '@/components/Dialog';

interface UserItem {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  createdAt: string | number;
  gameCount: number;
}

interface UsersResponse {
  users: UserItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

type ModalType = 'create' | 'edit' | 'password' | null;

export default function UsersPage() {
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
    mutationFn: async ({ id, ...body }: { id: string; name: string; email: string }) => {
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
    updateMutation.mutate({ id: editingUser.id, name: formName, email: formEmail });
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

  return (
    <div>
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">用户管理</h1>
          <p className="text-gray-500 mt-1">管理系统用户和访问权限</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm">
          <Plus size={16} />
          创建用户
        </button>
      </header>

      {/* Search */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <form
          onSubmit={handleSearch}
          className="flex gap-3">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="搜索用户名或邮箱..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700">
            搜索
          </button>
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setSearchInput('');
                setPage(1);
              }}
              className="px-3 py-2 text-gray-500 hover:text-gray-700">
              清除
            </button>
          )}
        </form>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">加载中...</div>
        ) : !data?.users.length ? (
          <div className="p-8 text-center text-gray-500">没有找到用户</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">名称</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">邮箱</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">游戏数</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">注册时间</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.users.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{user.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{user.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right">{user.gameCount}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString('zh-CN')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(user)}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="编辑">
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => openPassword(user)}
                          className="p-2 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded"
                          title="修改密码">
                          <Key size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(user)}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                          title="删除">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data && data.pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              共 {data.pagination.total} 个用户，第 {data.pagination.page} / {data.pagination.totalPages} 页
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50">
                上一页
              </button>
              <button
                onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
                disabled={page >= data.pagination.totalPages}
                className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50">
                下一页
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      <Dialog.Root
        open={modalType !== null}
        onOpenChange={(open) => {
          if (!open) closeModal();
        }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl p-6 w-full max-w-md shadow-xl z-50">
            <Dialog.Title className="text-lg font-semibold text-gray-900 mb-4">
              {modalType === 'create' && '创建用户'}
              {modalType === 'edit' && '编辑用户'}
              {modalType === 'password' && '修改密码'}
            </Dialog.Title>

            {/* Create Form */}
            {modalType === 'create' && (
              <form onSubmit={handleCreateSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">名称</label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
                    <input
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
                    <input
                      type="password"
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      minLength={6}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">确认密码</label>
                    <input
                      type="password"
                      value={formPasswordConfirm}
                      onChange={(e) => setFormPasswordConfirm(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      minLength={6}
                      required
                    />
                  </div>
                </div>
                <div className="flex gap-3 justify-end mt-6">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800">
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={activeMutation.isPending}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                    {activeMutation.isPending ? '创建中...' : '创建'}
                  </button>
                </div>
              </form>
            )}

            {/* Edit Form */}
            {modalType === 'edit' && (
              <form onSubmit={handleEditSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">名称</label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
                    <input
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      required
                    />
                  </div>
                </div>
                <div className="flex gap-3 justify-end mt-6">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800">
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={activeMutation.isPending}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                    {activeMutation.isPending ? '保存中...' : '保存'}
                  </button>
                </div>
              </form>
            )}

            {/* Password Form */}
            {modalType === 'password' && (
              <form onSubmit={handlePasswordSubmit}>
                <p className="text-sm text-gray-500 mb-4">正在为用户「{editingUser?.name}」修改密码</p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">新密码</label>
                    <input
                      type="password"
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      minLength={6}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">确认新密码</label>
                    <input
                      type="password"
                      value={formPasswordConfirm}
                      onChange={(e) => setFormPasswordConfirm(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      minLength={6}
                      required
                    />
                  </div>
                </div>
                <div className="flex gap-3 justify-end mt-6">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800">
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={activeMutation.isPending}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                    {activeMutation.isPending ? '修改中...' : '修改密码'}
                  </button>
                </div>
              </form>
            )}

            {/* Error display */}
            {activeMutation.isError && <p className="mt-3 text-sm text-red-600">{activeMutation.error.message}</p>}

            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              aria-label="关闭">
              <X size={20} />
            </button>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
