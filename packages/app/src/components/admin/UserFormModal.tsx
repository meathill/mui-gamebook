'use client';

import { XIcon } from '@phosphor-icons/react';
import * as Dialog from '@radix-ui/react-dialog';
import { UserAiPermissionsFields } from '@/components/admin/UserAiPermissionsFields';
import type { AiPermissions } from '@/lib/ai-permissions';
import type { ModalType, UserItem } from '@/hooks/useUsersAdmin';

/** 创建/编辑/改密三个 mutation 输入输出类型各不相同，这里只需要它们共有的状态字段 */
interface ActiveMutationLike {
  isPending: boolean;
  isError: boolean;
  error: Error | null;
}

interface UserFormModalProps {
  modalType: ModalType;
  editingUser: UserItem | null;
  formName: string;
  setFormName: (value: string) => void;
  formEmail: string;
  setFormEmail: (value: string) => void;
  formPassword: string;
  setFormPassword: (value: string) => void;
  formPasswordConfirm: string;
  setFormPasswordConfirm: (value: string) => void;
  formAiPermissions: AiPermissions | null;
  setFormAiPermissions: (value: AiPermissions | null) => void;
  activeMutation: ActiveMutationLike;
  onClose: () => void;
  onCreateSubmit: (e: React.FormEvent) => void;
  onEditSubmit: (e: React.FormEvent) => void;
  onPasswordSubmit: (e: React.FormEvent) => void;
}

/**
 * 创建 / 编辑 / 修改密码三种表单共用的弹窗
 */
export default function UserFormModal({
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
  onClose,
  onCreateSubmit,
  onEditSubmit,
  onPasswordSubmit,
}: UserFormModalProps) {
  return (
    <Dialog.Root
      open={modalType !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
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
            <form onSubmit={onCreateSubmit}>
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
                  onClick={onClose}
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
            <form onSubmit={onEditSubmit}>
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
                <UserAiPermissionsFields
                  value={formAiPermissions}
                  onChange={setFormAiPermissions}
                />
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button
                  type="button"
                  onClick={onClose}
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
            <form onSubmit={onPasswordSubmit}>
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
                  onClick={onClose}
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
          {activeMutation.isError && <p className="mt-3 text-sm text-red-600">{activeMutation.error?.message}</p>}

          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            aria-label="关闭">
            <XIcon size={20} />
          </button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
