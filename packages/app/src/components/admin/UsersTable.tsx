'use client';

import { KeyIcon, PencilIcon, TrashIcon } from '@phosphor-icons/react';
import { formatDate } from '@mui-gamebook/site-common/utils';
import PaginationBar from '@/components/admin/PaginationBar';
import SortableHeader from '@/components/admin/SortableHeader';
import { formatPlanLabel, type UserItem, type UsersResponse } from '@/hooks/useUsersAdmin';
import type { SortOrder } from '@/lib/list-query';

interface UsersTableProps {
  users: UserItem[] | undefined;
  isLoading: boolean;
  pagination: UsersResponse['pagination'] | undefined;
  page: number;
  activeSort: string;
  order: SortOrder;
  onSort: (sortKey: string) => void;
  onPageChange: (updater: (page: number) => number) => void;
  onEdit: (user: UserItem) => void;
  onPassword: (user: UserItem) => void;
  onDelete: (user: UserItem) => void;
}

/**
 * 用户列表表格 + 排序表头 + 分页
 */
export default function UsersTable({
  users,
  isLoading,
  pagination,
  page,
  activeSort,
  order,
  onSort,
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
                <SortableHeader
                  label="名称"
                  sortKey="name"
                  activeSort={activeSort}
                  order={order}
                  onSort={onSort}
                />
                <SortableHeader
                  label="邮箱"
                  sortKey="email"
                  activeSort={activeSort}
                  order={order}
                  onSort={onSort}
                />
                <SortableHeader
                  label="游戏数"
                  sortKey="gameCount"
                  activeSort={activeSort}
                  order={order}
                  onSort={onSort}
                  align="right"
                />
                <SortableHeader
                  label="注册时间"
                  sortKey="createdAt"
                  activeSort={activeSort}
                  order={order}
                  onSort={onSort}
                />
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">身份</th>
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
                  <td className="px-6 py-4 text-sm text-gray-500">{formatDate(user.createdAt)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1.5">
                      {user.isAdmin && (
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs">管理员</span>
                      )}
                      <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-xs">
                        {formatPlanLabel(user.planCode)}
                      </span>
                    </div>
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

      {pagination && (
        <PaginationBar
          page={page}
          total={pagination.total}
          totalPages={pagination.totalPages}
          unit="个用户"
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}
