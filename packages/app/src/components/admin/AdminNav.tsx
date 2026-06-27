'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TrendUpIcon, UsersIcon, GearIcon } from '@phosphor-icons/react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { href: '/admin/stats', label: '全站统计', icon: <TrendUpIcon size={20} /> },
  { href: '/admin/users', label: '用户管理', icon: <UsersIcon size={20} /> },
  { href: '/admin/config', label: '系统配置', icon: <GearIcon size={20} /> },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => {
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
