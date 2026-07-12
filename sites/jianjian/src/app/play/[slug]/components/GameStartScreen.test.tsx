import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import GameStartScreen from './GameStartScreen';

describe('GameStartScreen', () => {
  it('渲染标题，没有 coverImage/description 时不渲染对应元素', () => {
    render(
      <GameStartScreen
        title="迷失之城"
        onStart={vi.fn()}
      />,
    );

    expect(screen.getByText('迷失之城')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('有 coverImage 时渲染封面图', () => {
    render(
      <GameStartScreen
        title="迷失之城"
        coverImage="https://x.com/cover.png"
        onStart={vi.fn()}
      />,
    );

    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://x.com/cover.png');
  });

  it('有 description 时渲染描述文字', () => {
    render(
      <GameStartScreen
        title="迷失之城"
        description="一场惊险的冒险"
        onStart={vi.fn()}
      />,
    );

    expect(screen.getByText('一场惊险的冒险')).toBeInTheDocument();
  });

  it('点击开始按钮调用 onStart', () => {
    const onStart = vi.fn();
    render(
      <GameStartScreen
        title="迷失之城"
        onStart={onStart}
      />,
    );

    fireEvent.click(screen.getByText('开始冒险！'));

    expect(onStart).toHaveBeenCalledTimes(1);
  });
});
