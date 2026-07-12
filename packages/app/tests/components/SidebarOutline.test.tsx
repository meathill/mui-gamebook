import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SidebarOutline from '@/components/editor/sidebar/SidebarOutline';

describe('SidebarOutline', () => {
  it('没有场景时显示空状态提示', () => {
    render(<SidebarOutline sceneIds={[]} />);

    expect(screen.getByText('暂无场景')).toBeInTheDocument();
  });

  it('按顺序列出场景 ID，并显示总数', () => {
    render(<SidebarOutline sceneIds={['start', 'forest', 'cave']} />);

    expect(screen.getByText('start')).toBeInTheDocument();
    expect(screen.getByText('forest')).toBeInTheDocument();
    expect(screen.getByText('cave')).toBeInTheDocument();
    expect(screen.getByText('共 3 个场景')).toBeInTheDocument();
  });

  it('点击场景条目调用 onScrollToScene', () => {
    const onScrollToScene = vi.fn();
    render(
      <SidebarOutline
        sceneIds={['start', 'forest']}
        onScrollToScene={onScrollToScene}
      />,
    );

    fireEvent.click(screen.getByText('forest'));

    expect(onScrollToScene).toHaveBeenCalledWith('forest');
  });
});
