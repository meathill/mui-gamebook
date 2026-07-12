'use client';

import { KeyIcon, PencilIcon, TrashIcon } from '@phosphor-icons/react';
import type { UserItem, UsersResponse } from '@/hooks/useUsersAdmin';

interface UsersTableProps {
  users: UserItem[] | undefined;
  isLoading: boolean;
  pagination: UsersResponse['pagination'] | undefined;
  page: number;
  onPageChange: (updater: (page: number) => number) => void;
  onEdit: (user: UserItem) => void;
  onPassword: (user: UserItem) => void;
  onDelete: (user: UserItem) => void;
}

/**
 * 用户列表表格 + 分页
 */
export default function UsersTable({
  users,
  isLoading,
  pagination,
  page,
  onPageChange,
  onEdit,
  onPassword,
  onDelete,
}: UsersTableProps) {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {isLoading ? (
        <div className="p-8 text-center text-gray-500">加载中...</div>
      ) : !users?.length ? (
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
              {users.map((user) => (
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
                        onClick={() => onEdit(user)}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="编辑">
                        <PencilIcon size={16} />
                      </button>
                      <button
                        onClick={() => onPassword(user)}
                        className="p-2 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded"
                        title="修改密码">
                        <KeyIcon size={16} />
                      </button>
                      <button
                        onClick={() => onDelete(user)}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                        title="删除">
                        <TrashIcon size={16} />
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
      {pagination && pagination.totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <span className="text-sm text-gray-500">
            共 {pagination.total} 个用户，第 {pagination.page} / {pagination.totalPages} 页
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50">
              上一页
            </button>
            <button
              onClick={() => onPageChange((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50">
              下一页
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
