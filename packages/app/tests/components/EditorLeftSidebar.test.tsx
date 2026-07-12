import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/editor/sidebar', () => ({
  SidebarOutline: (props: { sceneIds: string[] }) => <div data-testid="outline">大纲：{props.sceneIds.join(',')}</div>,
  SidebarVariables: () => <div data-testid="variables">变量面板</div>,
  SidebarCharacters: () => <div data-testid="characters">角色面板</div>,
}));

import EditorLeftSidebar from '@/components/editor/EditorLeftSidebar';

const game = {
  slug: 'g',
  title: 'T',
  tags: [],
  published: false,
  initialState: { gold: 100 },
  ai: { style: {}, characters: { hero: { name: '英雄' } } },
  scenes: {},
} as never;

describe('EditorLeftSidebar', () => {
  it('默认显示大纲面板', () => {
    render(
      <EditorLeftSidebar
        game={game}
        gameId="g1"
        onGameChange={vi.fn()}
        sceneIds={['start']}
      />,
    );

    expect(screen.getByTestId('outline')).toHaveTextContent('大纲：start');
    expect(screen.queryByTestId('variables')).not.toBeInTheDocument();
  });

  it('点击变量 tab 切换到变量面板', () => {
    render(
      <EditorLeftSidebar
        game={game}
        gameId="g1"
        onGameChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText('变量'));

    expect(screen.getByTestId('variables')).toBeInTheDocument();
    expect(screen.queryByTestId('outline')).not.toBeInTheDocument();
  });

  it('点击角色 tab 切换到角色面板', () => {
    render(
      <EditorLeftSidebar
        game={game}
        gameId="g1"
        onGameChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText('角色'));

    expect(screen.getByTestId('characters')).toBeInTheDocument();
  });

  it('切回大纲 tab', () => {
    render(
      <EditorLeftSidebar
        game={game}
        gameId="g1"
        onGameChange={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText('角色'));

    fireEvent.click(screen.getByText('大纲'));

    expect(screen.getByTestId('outline')).toBeInTheDocument();
  });
});
