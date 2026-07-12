'use client';

import { MagnifyingGlassIcon, PlusIcon } from '@phosphor-icons/react';
import UserFormModal from '@/components/admin/UserFormModal';
import UsersTable from '@/components/admin/UsersTable';
import { useUsersAdmin } from '@/hooks/useUsersAdmin';

export default function UsersPage() {
  const admin = useUsersAdmin();

  return (
    <div>
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">用户管理</h1>
          <p className="text-gray-500 mt-1">管理系统用户和访问权限</p>
        </div>
        <button
          onClick={admin.openCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm">
          <PlusIcon size={16} />
          创建用户
        </button>
      </header>

      {/* 搜索 */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <form
          onSubmit={admin.handleSearch}
          className="flex gap-3">
          <div className="relative flex-1">
            <MagnifyingGlassIcon
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={admin.searchInput}
              onChange={(e) => admin.setSearchInput(e.target.value)}
              placeholder="搜索用户名或邮箱..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700">
            搜索
          </button>
          {admin.search && (
            <button
              type="button"
              onClick={admin.handleClearSearch}
              className="px-3 py-2 text-gray-500 hover:text-gray-700">
              清除
            </button>
          )}
        </form>
      </div>

      <UsersTable
        users={admin.data?.users}
        isLoading={admin.isLoading}
        pagination={admin.data?.pagination}
        page={admin.page}
        onPageChange={admin.setPage}
        onEdit={admin.openEdit}
        onPassword={admin.openPassword}
        onDelete={admin.handleDelete}
      />

      <UserFormModal
        modalType={admin.modalType}
        editingUser={admin.editingUser}
        formName={admin.formName}
        setFormName={admin.setFormName}
        formEmail={admin.formEmail}
        setFormEmail={admin.setFormEmail}
        formPassword={admin.formPassword}
        setFormPassword={admin.setFormPassword}
        formPasswordConfirm={admin.formPasswordConfirm}
        setFormPasswordConfirm={admin.setFormPasswordConfirm}
        formAiPermissions={admin.formAiPermissions}
        setFormAiPermissions={admin.setFormAiPermissions}
        activeMutation={admin.activeMutation}
        onClose={admin.closeModal}
        onCreateSubmit={admin.handleCreateSubmit}
        onEditSubmit={admin.handleEditSubmit}
        onPasswordSubmit={admin.handlePasswordSubmit}
      />
    </div>
  );
}
