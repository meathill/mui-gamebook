import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { RouteMapNode } from '@mui-gamebook/site-common/game-player';
import RouteMapScreen from './RouteMapScreen';

const nodes: RouteMapNode[] = [
  { sceneId: 'start', label: '开始', description: '故事的起点', isUnlocked: true, isVisited: true },
  { sceneId: 'branch', label: '分支', description: '一个选择', isUnlocked: true, isVisited: false },
  { sceneId: 'secret', label: '???', isUnlocked: false, isVisited: false },
];

describe('RouteMapScreen', () => {
  it('渲染全部节点的 label', () => {
    render(
      <RouteMapScreen
        nodes={nodes}
        onSelectNode={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText('开始')).toBeInTheDocument();
    expect(screen.getByText('分支')).toBeInTheDocument();
    expect(screen.getByText('???')).toBeInTheDocument();
  });

  it('已解锁节点显示描述，未解锁节点不显示描述', () => {
    render(
      <RouteMapScreen
        nodes={nodes}
        onSelectNode={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText('故事的起点')).toBeInTheDocument();
    expect(screen.getByText('一个选择')).toBeInTheDocument();
  });

  it('点击已解锁节点触发 onSelectNode', () => {
    const onSelectNode = vi.fn();
    render(
      <RouteMapScreen
        nodes={nodes}
        onSelectNode={onSelectNode}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText('分支'));

    expect(onSelectNode).toHaveBeenCalledWith('branch');
  });

  it('点击未解锁节点不触发 onSelectNode', () => {
    const onSelectNode = vi.fn();
    render(
      <RouteMapScreen
        nodes={nodes}
        onSelectNode={onSelectNode}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText('???'));

    expect(onSelectNode).not.toHaveBeenCalled();
  });

  it('点击关闭按钮触发 onClose', () => {
    const onClose = vi.fn();
    render(
      <RouteMapScreen
        nodes={nodes}
        onSelectNode={vi.fn()}
        onClose={onClose}
      />,
    );

    fireEvent.click(screen.getByRole('button'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
