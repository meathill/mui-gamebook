import { NextIntlClientProvider } from 'next-intl';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { PlayableGame } from '@mui-gamebook/parser/src/types';
import TitleScreen from '@/components/game-player/TitleScreen';
import messages from '../../src/i18n/messages/en.json';

vi.mock('@/components/ShareButton', () => ({
  default: ({ title }: { title: string }) => <div data-testid="share-button">{title}</div>,
}));

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider
      messages={messages}
      locale="en">
      {ui}
    </NextIntlClientProvider>,
  );
}

const baseGame: PlayableGame = {
  slug: 'lost-city',
  title: '迷失之城',
} as PlayableGame;

describe('TitleScreen', () => {
  it('渲染游戏标题和默认描述（无 description/backgroundStory 时）', () => {
    renderWithProviders(
      <TitleScreen
        game={baseGame}
        hasSave={false}
        onStart={vi.fn()}
        onRestart={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: '迷失之城' })).toBeInTheDocument();
    expect(screen.getByText('An interactive adventure awaits you.')).toBeInTheDocument();
  });

  it('有 description 时优先于默认文案', () => {
    renderWithProviders(
      <TitleScreen
        game={{ ...baseGame, description: '一场惊险的冒险' }}
        hasSave={false}
        onStart={vi.fn()}
        onRestart={vi.fn()}
      />,
    );

    expect(screen.getByText('一场惊险的冒险')).toBeInTheDocument();
    expect(screen.queryByText('An interactive adventure awaits you.')).not.toBeInTheDocument();
  });

  it('有 backgroundStory 时渲染 markdown 背景故事，优先于 description', () => {
    renderWithProviders(
      <TitleScreen
        game={{ ...baseGame, description: '简介', backgroundStory: '很久以前...' }}
        hasSave={false}
        onStart={vi.fn()}
        onRestart={vi.fn()}
      />,
    );

    expect(screen.getByText('很久以前...')).toBeInTheDocument();
    expect(screen.queryByText('简介')).not.toBeInTheDocument();
  });

  it('渲染 tags 列表', () => {
    renderWithProviders(
      <TitleScreen
        game={{ ...baseGame, tags: ['悬疑', '冒险'] }}
        hasSave={false}
        onStart={vi.fn()}
        onRestart={vi.fn()}
      />,
    );

    expect(screen.getByText('悬疑')).toBeInTheDocument();
    expect(screen.getByText('冒险')).toBeInTheDocument();
  });

  it('没有 cover_image 时显示标题占位背景', () => {
    renderWithProviders(
      <TitleScreen
        game={baseGame}
        hasSave={false}
        onStart={vi.fn()}
        onRestart={vi.fn()}
      />,
    );

    expect(screen.getAllByText('迷失之城').length).toBeGreaterThan(1);
  });

  it('点击"开始冒险"按钮调用 onStart', () => {
    const onStart = vi.fn();
    renderWithProviders(
      <TitleScreen
        game={baseGame}
        hasSave={false}
        onStart={onStart}
        onRestart={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText('Start Adventure'));

    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('无存档时只有"开始冒险"，不渲染"重新开始"', () => {
    renderWithProviders(
      <TitleScreen
        game={baseGame}
        hasSave={false}
        onStart={vi.fn()}
        onRestart={vi.fn()}
      />,
    );

    expect(screen.getByText('Start Adventure')).toBeInTheDocument();
    expect(screen.queryByText('Start Over')).not.toBeInTheDocument();
  });

  it('有存档时主按钮变"继续冒险"，并额外提供"重新开始"', () => {
    const onStart = vi.fn();
    const onRestart = vi.fn();
    renderWithProviders(
      <TitleScreen
        game={baseGame}
        hasSave={true}
        onStart={onStart}
        onRestart={onRestart}
      />,
    );

    expect(screen.queryByText('Start Adventure')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Continue'));
    expect(onStart).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('Start Over'));
    expect(onRestart).toHaveBeenCalledTimes(1);
  });

  it('"返回首页"链接指向 /', () => {
    renderWithProviders(
      <TitleScreen
        game={baseGame}
        hasSave={false}
        onStart={vi.fn()}
        onRestart={vi.fn()}
      />,
    );

    expect(screen.getByText('Back to Library').closest('a')).toHaveAttribute('href', '/');
  });

  it('title_layout=fullscreen 时渲染全屏毛玻璃版式（传统白卡标记缺席）', () => {
    const { container } = renderWithProviders(
      <TitleScreen
        game={{ ...baseGame, title_layout: 'fullscreen', tags: ['悬疑'] }}
        hasSave={false}
        onStart={vi.fn()}
        onRestart={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: '迷失之城' })).toBeInTheDocument();
    expect(screen.getByText('悬疑')).toBeInTheDocument();
    expect(screen.getByText('Start Adventure')).toBeInTheDocument();
    // 毛玻璃卡：白字 + backdrop-blur + 白色半透明边框
    expect(container.querySelector('.backdrop-blur-xl')).toBeInTheDocument();
  });

  it('传入 authorName/updatedAt 时渲染作者行（全屏与传统版皆可）', () => {
    const { rerender } = renderWithProviders(
      <TitleScreen
        game={{ ...baseGame, title_layout: 'fullscreen' }}
        hasSave={false}
        onStart={vi.fn()}
        onRestart={vi.fn()}
        authorName="作者甲"
        updatedAt="2026-09-01T00:00:00.000Z"
      />,
    );
    expect(screen.getByText(/作者甲/)).toBeInTheDocument();

    rerender(
      <NextIntlClientProvider
        messages={messages}
        locale="en">
        <TitleScreen
          game={baseGame}
          hasSave={false}
          onStart={vi.fn()}
          onRestart={vi.fn()}
          authorName="作者甲"
        />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText(/作者甲/)).toBeInTheDocument();
  });

  it('不传作者信息时不渲染作者行（经典播放页已有，不重复）', () => {
    renderWithProviders(
      <TitleScreen
        game={baseGame}
        hasSave={false}
        onStart={vi.fn()}
        onRestart={vi.fn()}
      />,
    );

    expect(screen.queryByText(/作者/)).not.toBeInTheDocument();
  });
});
