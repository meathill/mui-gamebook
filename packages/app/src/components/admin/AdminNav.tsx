'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Gamepad2, Settings, TrendingUp } from 'lucide-react';
import { authClient } from '@/lib/auth-client';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { href: '/admin/dashboard', label: '数据统计', icon: <LayoutDashboard size={20} /> },
  { href: '/admin/stats', label: '全站统计', icon: <TrendingUp size={20} /> },
  { href: '/admin/games', label: '游戏管理', icon: <Gamepad2 size={20} /> },
  { href: '/admin/config', label: '系统配置', icon: <Settings size={20} /> },
];

export default function AdminNav() {
  const pathname = usePathname();
  const { data: session } = authClient.useSession();
  const email = session?.user?.email;

  const filteredNavItems = navItems.filter((item) => {
    if (item.href === '/admin/stats') {
      return email === 'meathill@gmail.com' || email === '/admin/config';
    }
    return true;
  });

  return (
    <nav className="flex flex-col gap-1">
      {filteredNavItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              isActive ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}>
            {item.icon}
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
