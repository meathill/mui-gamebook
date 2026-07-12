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
        onStart={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: '迷失之城' })).toBeInTheDocument();
    expect(screen.getByText('An interactive adventure awaits you.')).toBeInTheDocument();
  });

  it('有 description 时优先于默认文案', () => {
    renderWithProviders(
      <TitleScreen
        game={{ ...baseGame, description: '一场惊险的冒险' }}
        onStart={vi.fn()}
      />,
    );

    expect(screen.getByText('一场惊险的冒险')).toBeInTheDocument();
    expect(screen.queryByText('An interactive adventure awaits you.')).not.toBeInTheDocument();
  });

  it('有 backgroundStory 时渲染 markdown 背景故事，优先于 description', () => {
    renderWithProviders(
      <TitleScreen
        game={{ ...baseGame, description: '简介', backgroundStory: '很久以前...' }}
        onStart={vi.fn()}
      />,
    );

    expect(screen.getByText('很久以前...')).toBeInTheDocument();
    expect(screen.queryByText('简介')).not.toBeInTheDocument();
  });

  it('渲染 tags 列表', () => {
    renderWithProviders(
      <TitleScreen
        game={{ ...baseGame, tags: ['悬疑', '冒险'] }}
        onStart={vi.fn()}
      />,
    );

    expect(screen.getByText('悬疑')).toBeInTheDocument();
    expect(screen.getByText('冒险')).toBeInTheDocument();
  });

  it('没有 cover_image 时显示标题占位背景', () => {
    renderWithProviders(
      <TitleScreen
        game={baseGame}
        onStart={vi.fn()}
      />,
    );

    expect(screen.getAllByText('迷失之城').length).toBeGreaterThan(1);
  });

  it('点击"开始冒险"按钮调用 onStart', () => {
    const onStart = vi.fn();
    renderWithProviders(
      <TitleScreen
        game={baseGame}
        onStart={onStart}
      />,
    );

    fireEvent.click(screen.getByText('Start Adventure'));

    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('"返回首页"链接指向 /', () => {
    renderWithProviders(
      <TitleScreen
        game={baseGame}
        onStart={vi.fn()}
      />,
    );

    expect(screen.getByText('Back to Library').closest('a')).toHaveAttribute('href', '/');
  });
});
