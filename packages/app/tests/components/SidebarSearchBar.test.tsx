import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SidebarSearchBar from '@/components/editor/sidebar/SidebarSearchBar';

describe('SidebarSearchBar', () => {
  it('输入时调用 onSearchChange', () => {
    const onSearchChange = vi.fn();
    render(
      <SidebarSearchBar
        searchQuery=""
        onSearchChange={onSearchChange}
        onCreateNew={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('搜索...'), { target: { value: 'gold' } });

    expect(onSearchChange).toHaveBeenCalledWith('gold');
  });

  it('点击新建按钮调用 onCreateNew', () => {
    const onCreateNew = vi.fn();
    render(
      <SidebarSearchBar
        searchQuery=""
        onSearchChange={vi.fn()}
        onCreateNew={onCreateNew}
      />,
    );

    fireEvent.click(screen.getByTitle('新建'));

    expect(onCreateNew).toHaveBeenCalledTimes(1);
  });

  it('回显传入的 searchQuery', () => {
    render(
      <SidebarSearchBar
        searchQuery="已有搜索词"
        onSearchChange={vi.fn()}
        onCreateNew={vi.fn()}
      />,
    );

    expect(screen.getByDisplayValue('已有搜索词')).toBeInTheDocument();
  });
});
