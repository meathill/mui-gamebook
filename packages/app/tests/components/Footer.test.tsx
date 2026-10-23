import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Footer from '@/components/Footer';
import LocaleProvider from '@/i18n/locale-provider';
import enMessages from '../../src/i18n/messages/en.json';
import zhMessages from '../../src/i18n/messages/zh.json';

describe('Footer', () => {
  function renderFooter(locale: 'zh' | 'en' = 'zh') {
    return render(
      <LocaleProvider
        initialLocale={locale}
        initialMessages={locale === 'zh' ? zhMessages : enMessages}>
        <Footer />
      </LocaleProvider>,
    );
  }

  it('渲染品牌 + 三个分组列', () => {
    renderFooter();

    expect(screen.getByText('姆伊游戏书')).toBeInTheDocument();
    expect(screen.getByText('读故事')).toBeInTheDocument();
    expect(screen.getByText('开始创作')).toBeInTheDocument();
    expect(screen.getByText('支持')).toBeInTheDocument();
  });

  it('分组链接指向正确地址且关闭预取', () => {
    const { container } = renderFooter();

    const links: Record<string, string> = {
      互动小说: '/interactive-fiction',
      玩法指南: '/how-to-play',
      制作互动小说: '/create',
      'AI 技能': '/skills',
      开源部署: '/open',
      联系我们: '/contact',
      隐私政策: '/privacy',
      服务条款: '/terms',
    };
    for (const [text, href] of Object.entries(links)) {
      expect(screen.getByText(text).closest('a')).toHaveAttribute('href', href);
    }
    // 链接不再挤在单行容器里
    expect(container.querySelector('footer .grid')).toBeInTheDocument();
  });

  it('底部栏有版权、版本与外链', () => {
    renderFooter();

    expect(screen.getByText(/保留所有权利/)).toBeInTheDocument();
    expect(screen.getByText('Featured on First Look').closest('a')).toHaveAttribute('href', 'https://firstlook.tools');
  });

  it.each([
    ['zh', '保留所有权利。'],
    ['en', 'All rights reserved.'],
  ] as const)('%s 版权展示公司名称、当前年份和官网链接', (locale, rights) => {
    renderFooter(locale);

    const companyLink = screen.getByRole('link', { name: 'Meathill LLC' });
    expect(companyLink.parentElement).toHaveTextContent(`© ${new Date().getFullYear()} Meathill LLC`);
    expect(companyLink.parentElement).toHaveTextContent(rights);
    expect(companyLink).toHaveAttribute('href', 'https://meathill.com');
    expect(companyLink).toHaveAttribute('target', '_blank');
    expect(companyLink).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
