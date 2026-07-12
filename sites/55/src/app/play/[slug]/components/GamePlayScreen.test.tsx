import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { PlayableGame, PlayableScene } from '@mui-gamebook/parser/src/types';
import type { getVisibleVariables } from '@mui-gamebook/parser/src/utils';
import GamePlayScreen from './GamePlayScreen';

// jsdom 未实现 Element.scrollTo
Element.prototype.scrollTo = vi.fn();

const mockGame: PlayableGame = {
  slug: 'demo-55',
  title: 'Demo',
  initialState: { gold: 10, has_key: false },
  scenes: {},
};

const sceneA: PlayableScene = {
  id: 'a',
  nodes: [
    { type: 'text', content: 'Line one.' },
    { type: 'text', content: 'Line two.' },
    { type: 'choice', text: 'Go on', nextSceneId: 'b' },
    { type: 'choice', text: 'Locked path', nextSceneId: 'c', condition: 'has_key == true' },
  ],
};

const noVisibleVariables: ReturnType<typeof getVisibleVariables> = [];

function baseProps() {
  return {
    game: mockGame,
    currentScene: sceneA,
    runtimeState: { gold: 10, has_key: false },
    visibleVariables: noVisibleVariables,
    showEndScreen: false,
    isAutoPlaying: false,
    isSkipping: false,
    onChoice: vi.fn(),
    onToggleAutoPlay: vi.fn(),
    onToggleSkip: vi.fn(),
    onOpenSave: vi.fn(),
    onOpenLoad: vi.fn(),
    onOpenRouteMap: vi.fn(),
    onOpenSettings: vi.fn(),
    onReturnToTitle: vi.fn(),
    onRestart: vi.fn(),
  };
}

// 场景区域是唯一的可点击层：第一次点击让当前行瞬间打完，
// 已打完时再点一次才推进到下一行（或在最后一行时显示选项）。
function click(container: HTMLElement) {
  fireEvent.click(container.querySelector('.cursor-pointer') as HTMLElement);
}

describe('GamePlayScreen', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('逐行推进文本，全部展示后显示可用选项', () => {
    const { container } = render(<GamePlayScreen {...baseProps()} />);

    expect(screen.queryByText('Go on')).not.toBeInTheDocument();

    click(container); // 打完第一行
    expect(screen.getByText('Line one.')).toBeInTheDocument();
    expect(screen.queryByText('Line two.')).not.toBeInTheDocument();

    click(container); // 推进到第二行
    click(container); // 打完第二行，全部展示

    expect(screen.getByText('Line two.')).toBeInTheDocument();
    expect(screen.getByText('Go on')).toBeInTheDocument();
  });

  it('不满足条件的选项不显示，点击选项调用 onChoice', () => {
    const props = baseProps();
    const { container } = render(<GamePlayScreen {...props} />);

    click(container);
    click(container);
    click(container);

    expect(screen.queryByText('Locked path')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Go on'));
    expect(props.onChoice).toHaveBeenCalledWith('b', undefined);
  });

  it('拥有钥匙时显示条件选项', () => {
    const props = { ...baseProps(), runtimeState: { gold: 10, has_key: true } };
    const { container } = render(<GamePlayScreen {...props} />);

    click(container);
    click(container);
    click(container);

    expect(screen.getByText('Locked path')).toBeInTheDocument();
  });

  it('isSkipping 为 true 时跳过打字机效果，直接展示全部文本和选项', () => {
    const props = { ...baseProps(), isSkipping: true };
    render(<GamePlayScreen {...props} />);

    expect(screen.getByText('Line one.')).toBeInTheDocument();
    expect(screen.getByText('Line two.')).toBeInTheDocument();
    expect(screen.getByText('Go on')).toBeInTheDocument();
  });

  it('展示结局时不再显示选项', () => {
    const props = { ...baseProps(), isSkipping: true, showEndScreen: true };
    render(<GamePlayScreen {...props} />);

    expect(screen.queryByText('Go on')).not.toBeInTheDocument();
    expect(screen.getByText('— 故事结束 —')).toBeInTheDocument();
  });

  it('点击重新开始 / 返回标题按钮触发对应回调', () => {
    const props = { ...baseProps(), isSkipping: true, showEndScreen: true };
    render(<GamePlayScreen {...props} />);

    fireEvent.click(screen.getByText('重新开始'));
    expect(props.onRestart).toHaveBeenCalled();

    fireEvent.click(screen.getByText('返回标题'));
    expect(props.onReturnToTitle).toHaveBeenCalled();
  });
});
