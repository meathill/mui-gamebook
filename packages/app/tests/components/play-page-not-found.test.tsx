import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/lib/games', () => ({
  cachedGetGameBySlug: vi.fn(),
}));

vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(async () => (key: string) => key),
}));

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
  redirect: vi.fn(),
}));

vi.mock('@/components/GamePlayer', () => ({
  default: () => <div data-testid="game-player" />,
}));

vi.mock('@/components/game-player', () => ({
  GamePlayerImmersive: () => <div data-testid="game-player-immersive" />,
}));

vi.mock('@/components/PlayWebMcpTools', () => ({
  default: () => null,
}));

vi.mock('@/components/RelatedGames', () => ({
  default: () => null,
}));

vi.mock('@/components/Comment', () => ({
  default: () => null,
}));

vi.mock('@/components/JsonLd', () => ({
  default: () => null,
}));

vi.mock('@mui-gamebook/site-common/utils', () => ({
  formatLongDate: (s: string) => s,
  getPublicSiteUrl: () => 'https://muistory.com',
}));

import PlayPage, { generateMetadata } from '@/app/play/[slug]/page';
import { cachedGetGameBySlug } from '@/lib/games';
import { notFound, redirect } from 'next/navigation';

const paramsOf = (slug: string) => Promise.resolve({ slug });

describe('PlayPage 缺失处理', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('游戏不存在时调 notFound（真 404，而非 200 空壳页）', async () => {
    (cachedGetGameBySlug as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(PlayPage({ params: paramsOf('gone') })).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalledTimes(1);
  });

  it('D1 故障时向上抛（走 500 错误边界，不进 ISR 缓存）', async () => {
    (cachedGetGameBySlug as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('D1 down'));

    await expect(PlayPage({ params: paramsOf('x') })).rejects.toThrow('D1 down');
    expect(notFound).not.toHaveBeenCalled();
  });

  it('正常游戏照常渲染播放器', async () => {
    (cachedGetGameBySlug as ReturnType<typeof vi.fn>).mockResolvedValue({
      title: 'T',
      slug: 't',
      scenes: {},
      tags: [],
    });

    render(await PlayPage({ params: paramsOf('t') }));

    expect(screen.getByTestId('game-player')).toBeTruthy();
    expect(notFound).not.toHaveBeenCalled();
  });

  it.each([
    'classic',
    'immersive',
  ] as const)('历史子站绑定在 %s 模式下仍在主站播放，canonical 和分享链接指向主站', async (displayMode) => {
    vi.mocked(cachedGetGameBySlug).mockResolvedValue({
      title: '历史作品',
      slug: '1-0771',
      subdomain: '11',
      site_template: 'visual-novel',
      display_mode: displayMode,
      scenes: {},
      tags: [],
      initialState: {},
    });

    render(await PlayPage({ params: paramsOf('1-0771') }));
    const metadata = await generateMetadata({ params: paramsOf('1-0771') });

    expect(screen.getByTestId(displayMode === 'classic' ? 'game-player' : 'game-player-immersive')).toBeTruthy();
    expect(redirect).not.toHaveBeenCalled();
    expect(metadata.alternates?.canonical).toBe('/play/1-0771');
    expect(metadata.openGraph?.url).toBe('https://muistory.com/play/1-0771');
  });
});
