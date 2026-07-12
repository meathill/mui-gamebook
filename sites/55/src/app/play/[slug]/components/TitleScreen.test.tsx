import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { PlayableGame } from '@mui-gamebook/parser/src/types';
import TitleScreen from './TitleScreen';

function makeGame(overrides: Partial<PlayableGame> = {}): PlayableGame {
  return { slug: 'demo', title: '演示游戏', ...overrides } as PlayableGame;
}

describe('TitleScreen', () => {
  it('没有 cover_image 时不渲染背景图', () => {
    render(
      <TitleScreen
        game={makeGame()}
        hasAutoSave={false}
        onNewGame={vi.fn()}
        onContinue={vi.fn()}
      />,
    );

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('有 cover_image 时渲染背景图', () => {
    const { container } = render(
      <TitleScreen
        game={makeGame({ cover_image: 'https://x.com/cover.png' })}
        hasAutoSave={false}
        onNewGame={vi.fn()}
        onContinue={vi.fn()}
      />,
    );

    // 背景图是纯装饰性的（alt=""），无 img 角色，直接查询元素
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://x.com/cover.png');
  });

  it('渲染标题，description 存在时渲染描述', () => {
    render(
      <TitleScreen
        game={makeGame({ description: '一场冒险' })}
        hasAutoSave={false}
        onNewGame={vi.fn()}
        onContinue={vi.fn()}
      />,
    );

    expect(screen.getByText('演示游戏')).toBeInTheDocument();
    expect(screen.getByText('一场冒险')).toBeInTheDocument();
  });

  it('hasAutoSave 为 false 时只显示"开始"按钮', () => {
    render(
      <TitleScreen
        game={makeGame()}
        hasAutoSave={false}
        onNewGame={vi.fn()}
        onContinue={vi.fn()}
      />,
    );

    expect(screen.getByText('开始')).toBeInTheDocument();
    expect(screen.queryByText('继续')).not.toBeInTheDocument();
  });

  it('hasAutoSave 为 true 时显示"继续"和"新游戏"按钮', () => {
    render(
      <TitleScreen
        game={makeGame()}
        hasAutoSave={true}
        onNewGame={vi.fn()}
        onContinue={vi.fn()}
      />,
    );

    expect(screen.getByText('继续')).toBeInTheDocument();
    expect(screen.getByText('新游戏')).toBeInTheDocument();
    expect(screen.queryByText('开始')).not.toBeInTheDocument();
  });

  it('点击"开始"（无存档时）调用 onNewGame', () => {
    const onNewGame = vi.fn();
    render(
      <TitleScreen
        game={makeGame()}
        hasAutoSave={false}
        onNewGame={onNewGame}
        onContinue={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText('开始'));

    expect(onNewGame).toHaveBeenCalledTimes(1);
  });

  it('点击"继续"调用 onContinue，点击"新游戏"调用 onNewGame', () => {
    const onNewGame = vi.fn();
    const onContinue = vi.fn();
    render(
      <TitleScreen
        game={makeGame()}
        hasAutoSave={true}
        onNewGame={onNewGame}
        onContinue={onContinue}
      />,
    );

    fireEvent.click(screen.getByText('继续'));
    fireEvent.click(screen.getByText('新游戏'));

    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(onNewGame).toHaveBeenCalledTimes(1);
  });
});
