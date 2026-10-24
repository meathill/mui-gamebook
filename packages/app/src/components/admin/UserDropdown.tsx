'use client';

import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100">
          <UserIcon size={16} />
          <span className="max-w-[120px] truncate">{username}</span>
          <CaretDownIcon size={14} />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="min-w-[180px]"
        sideOffset={5}
        align="end">
        <DropdownMenuItem onSelect={() => router.push('/my/dashboard')}>
          <SquaresFourIcon size={16} />
          控制面板
        </DropdownMenuItem>

        <DropdownMenuItem onSelect={() => router.push('/my/games')}>
          <GameControllerIcon size={16} />
          我的游戏
        </DropdownMenuItem>

        <DropdownMenuItem onSelect={() => router.push('/my/games')}>
          <PlusIcon size={16} />
          创建新游戏
        </DropdownMenuItem>

        {isAdmin && (
          <>
            <DropdownMenuSeparator />

            <DropdownMenuItem onSelect={() => router.push('/admin')}>
              <ShieldIcon size={16} />
              管理后台
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          variant="destructive"
          onSelect={handleSignOut}>
          <SignOutIcon size={16} />
          退出登录
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
