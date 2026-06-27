'use client';

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import {
  UserIcon,
  SquaresFourIcon,
  GameControllerIcon,
  PlusIcon,
  ShieldIcon,
  SignOutIcon,
  CaretDownIcon,
} from '@phosphor-icons/react';

interface UserDropdownProps {
  email: string;
  isAdmin?: boolean;
}

export default function UserDropdown({ email, isAdmin }: UserDropdownProps) {
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut();
    router.push('/sign-in');
  }

  // 获取用户名（邮箱 @ 前面的部分）
  const username = email.split('@')[0];

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors">
          <UserIcon size={16} />
          <span className="max-w-[120px] truncate">{username}</span>
          <CaretDownIcon size={14} />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="min-w-[180px] bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
          sideOffset={5}
          align="end">
          <DropdownMenu.Item
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer outline-none"
            onSelect={() => router.push('/my/dashboard')}>
            <SquaresFourIcon size={16} />
            数据统计
          </DropdownMenu.Item>

          <DropdownMenu.Item
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer outline-none"
            onSelect={() => router.push('/my/games')}>
            <GameControllerIcon size={16} />
            我的游戏
          </DropdownMenu.Item>

          <DropdownMenu.Item
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer outline-none"
            onSelect={() => router.push('/my/games')}>
            <PlusIcon size={16} />
            创建新游戏
          </DropdownMenu.Item>

          {isAdmin && (
            <>
              <DropdownMenu.Separator className="h-px bg-gray-200 my-1" />

              <DropdownMenu.Item
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer outline-none"
                onSelect={() => router.push('/admin')}>
                <ShieldIcon size={16} />
                管理后台
              </DropdownMenu.Item>
            </>
          )}

          <DropdownMenu.Separator className="h-px bg-gray-200 my-1" />

          <DropdownMenu.Item
            className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer outline-none"
            onSelect={handleSignOut}>
            <SignOutIcon size={16} />
            退出登录
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
