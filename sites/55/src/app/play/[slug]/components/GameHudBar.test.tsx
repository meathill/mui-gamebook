import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GameHudBar from './GameHudBar';

function baseProps() {
  return {
    sfx: { playClick: vi.fn(), playTick: vi.fn(), playHover: vi.fn(), playNext: vi.fn() },
    isAutoPlaying: false,
    isSkipping: false,
    onToggleAutoPlay: vi.fn(),
    onToggleSkip: vi.fn(),
    onOpenSave: vi.fn(),
    onOpenLoad: vi.fn(),
    onOpenRouteMap: vi.fn(),
    onOpenSettings: vi.fn(),
    onReturnToTitle: vi.fn(),
  };
}

describe('GameHudBar', () => {
  it('点击各按钮分别触发对应回调', () => {
    const props = baseProps();
    render(<GameHudBar {...props} />);

    fireEvent.click(screen.getByTitle('返回标题'));
    expect(props.onReturnToTitle).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByTitle('路线图'));
    expect(props.onOpenRouteMap).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByTitle('自动'));
    expect(props.onToggleAutoPlay).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByTitle('跳过'));
    expect(props.onToggleSkip).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByTitle('存档'));
    expect(props.onOpenSave).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByTitle('读档'));
    expect(props.onOpenLoad).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByTitle('设置'));
    expect(props.onOpenSettings).toHaveBeenCalledOnce();
  });

  it('isAutoPlaying / isSkipping 为 true 时对应按钮带 active 样式', () => {
    const props = { ...baseProps(), isAutoPlaying: true, isSkipping: true };
    render(<GameHudBar {...props} />);

    expect(screen.getByTitle('自动')).toHaveClass('hud-btn--active');
    expect(screen.getByTitle('跳过')).toHaveClass('hud-btn--active');
  });
});
