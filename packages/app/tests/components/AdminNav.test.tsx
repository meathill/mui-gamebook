import { render, screen } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { describe, expect, it, vi } from 'vitest';
import AdminNav from '@/components/admin/AdminNav';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a
      href={href}
      className={className}>
      {children}
    </a>
  ),
}));

describe('AdminNav', () => {
  it('渲染全部 4 个导航项', () => {
    vi.mocked(usePathname).mockReturnValue('/admin/stats');
    render(<AdminNav />);

    expect(screen.getByText('全站统计')).toBeInTheDocument();
    expect(screen.getByText('用户管理')).toBeInTheDocument();
    expect(screen.getByText('游戏管理')).toBeInTheDocument();
    expect(screen.getByText('系统配置')).toBeInTheDocument();
  });

  it('精确匹配当前路径时高亮对应导航项', () => {
    vi.mocked(usePathname).mockReturnValue('/admin/users');
    render(<AdminNav />);

    expect(screen.getByText('用户管理').closest('a')).toHaveClass('bg-blue-100');
    expect(screen.getByText('全站统计').closest('a')).not.toHaveClass('bg-blue-100');
  });

  it('路径为子路由时也高亮对应导航项', () => {
    vi.mocked(usePathname).mockReturnValue('/admin/games/123/edit');
    render(<AdminNav />);

    expect(screen.getByText('游戏管理').closest('a')).toHaveClass('bg-blue-100');
  });

  it('路径不匹配任何导航项时都不高亮', () => {
    vi.mocked(usePathname).mockReturnValue('/admin');
    render(<AdminNav />);

    for (const label of ['全站统计', '用户管理', '游戏管理', '系统配置']) {
      expect(screen.getByText(label).closest('a')).not.toHaveClass('bg-blue-100');
    }
  });
});
