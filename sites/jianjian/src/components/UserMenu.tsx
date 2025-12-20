'use client';

import { useEffect, useState } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Avatar from '@radix-ui/react-avatar';
import { LogOutIcon, UserIcon } from 'lucide-react';
import Link from 'next/link';
import { authClient } from '@/lib/auth-client';

interface User {
  name?: string | null;
  email?: string | null;
}

export default function UserMenu() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSession() {
      try {
        const session = await authClient.getSession();
        setUser(session.data?.user ?? null);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    fetchSession();
  }, []);

  async function handleSignOut() {
    await authClient.signOut();
    window.location.href = '/';
  }

  // 加载中或未登录时显示登录按钮
  if (loading || !user) {
    return (
      <Link
        href="/sign-in"
        className="btn btn-primary text-base py-2 px-5 min-h-0">
        <span className="mr-1">👋</span>
        登录
      </Link>
    );
  }

  // 获取用户名首字母
  const initial = (user.name || user.email || 'U').charAt(0).toUpperCase();

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className="outline-none cursor-pointer"
          aria-label="用户菜单">
          <Avatar.Root className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary border-[3px] border-primary-hover shadow-[0_4px_0_var(--primary-hover)] hover:translate-y-[2px] hover:shadow-[0_2px_0_var(--primary-hover)] transition-all">
            <Avatar.Fallback className="text-white text-xl font-bold">{initial}</Avatar.Fallback>
          </Avatar.Root>
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="min-w-[180px] bg-card-bg rounded-2xl border-[3px] border-card-border shadow-[0_6px_0_var(--card-shadow),0_8px_30px_rgba(0,0,0,0.1)] py-2 px-1 animate-bounce-in z-[100]"
          sideOffset={8}
          align="end">
          {/* 用户信息 */}
          <div className="px-3 py-2 border-b-2 border-card-border mb-2">
            <p className="font-bold text-foreground truncate">{user.name || '用户'}</p>
            <p className="text-sm text-foreground/60 truncate">{user.email}</p>
          </div>

          {/* 个人中心（可选） */}
          <DropdownMenu.Item asChild>
            <Link
              href="/profile"
              className="flex items-center gap-3 px-3 py-2 mx-1 rounded-xl text-foreground hover:bg-primary-light hover:text-primary cursor-pointer outline-none transition-colors">
              <UserIcon size={20} />
              <span className="font-semibold">个人中心</span>
            </Link>
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="h-[2px] bg-card-border my-2" />

          {/* 登出 */}
          <DropdownMenu.Item
            className="flex items-center gap-3 px-3 py-2 mx-1 rounded-xl text-foreground hover:bg-accent-pink/10 hover:text-accent-pink cursor-pointer outline-none transition-colors"
            onSelect={handleSignOut}>
            <LogOutIcon size={20} />
            <span className="font-semibold">退出登录</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
