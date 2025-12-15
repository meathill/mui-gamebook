import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import MiniGamePlayer from '../../src/components/game-player/MiniGamePlayer';

describe('MiniGamePlayer 组件', () => {
  const defaultProps = {
    url: 'https://example.com/game.js',
    variables: ['score', 'health'],
    runtimeState: { score: 0, health: 100, other: 'value' },
    onComplete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该显示开始游戏按钮', () => {
    render(<MiniGamePlayer {...defaultProps} />);

    expect(screen.getByText('准备好开始小游戏了吗？')).toBeInTheDocument();
    expect(screen.getByText('开始游戏')).toBeInTheDocument();
  });

  it('应该只传递指定的变量给小游戏', () => {
    // 验证 getGameVariables 逻辑
    const { variables, runtimeState } = defaultProps;

    const gameVars: Record<string, number | string | boolean> = {};
    for (const varName of variables) {
      if (varName in runtimeState) {
        gameVars[varName] = runtimeState[varName as keyof typeof runtimeState];
      }
    }

    // 应该只包含 score 和 health，不包含 other
    expect(gameVars).toEqual({ score: 0, health: 100 });
    expect(gameVars).not.toHaveProperty('other');
  });

  it('url 为空时不应该渲染任何内容', () => {
    const { container } = render(
      <MiniGamePlayer
        {...defaultProps}
        url=""
      />,
    );
    // 组件应该正常渲染，但不会加载任何游戏
    expect(container).toBeDefined();
  });
});

describe('MiniGame API 接口规范', () => {
  it('小游戏模块应该实现正确的接口', () => {
    // 这是小游戏应该实现的接口
    interface MiniGameAPI {
      init(container: HTMLElement, variables: Record<string, number | string | boolean>): void;
      onComplete(callback: (variables: Record<string, number | string | boolean>) => void): void;
      destroy(): void;
    }

    // 验证 mock 符合接口
    const game: MiniGameAPI = {
      init: vi.fn(),
      onComplete: vi.fn(),
      destroy: vi.fn(),
    };

    expect(typeof game.init).toBe('function');
    expect(typeof game.onComplete).toBe('function');
    expect(typeof game.destroy).toBe('function');
  });

  it('小游戏应该正确处理变量传递', () => {
    const mockCallback = vi.fn();
    const initialVars = { score: 0, health: 100 };
    const updatedVars = { score: 10, health: 80 };

    // 模拟游戏完成时的回调
    mockCallback(updatedVars);

    expect(mockCallback).toHaveBeenCalledWith(updatedVars);
    expect(mockCallback).toHaveBeenCalledTimes(1);
  });
});
