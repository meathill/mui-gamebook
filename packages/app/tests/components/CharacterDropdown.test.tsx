import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CharacterDropdown from '@/components/editor/MentionInput/CharacterDropdown';

const characters = [
  { id: 'hero', character: { name: '英雄' } },
  { id: 'villain', character: { name: '反派' } },
];

function baseProps(overrides: Record<string, unknown> = {}) {
  return {
    characters,
    onSelect: vi.fn(),
    onClose: vi.fn(),
    searchTerm: '',
    selectedIndex: 0,
    position: { top: 0, left: 0 },
    ...overrides,
  };
}

describe('CharacterDropdown', () => {
  it('没有匹配角色时显示提示', () => {
    render(<CharacterDropdown {...baseProps({ searchTerm: 'xyz' })} />);

    expect(screen.getByText('没有匹配的角色')).toBeInTheDocument();
  });

  it('按 ID 或名称过滤角色', () => {
    render(<CharacterDropdown {...baseProps({ searchTerm: '英雄' })} />);

    expect(screen.getByText('英雄')).toBeInTheDocument();
    expect(screen.queryByText('反派')).not.toBeInTheDocument();
  });

  it('点击角色触发 onSelect', () => {
    const onSelect = vi.fn();
    render(<CharacterDropdown {...baseProps({ onSelect })} />);

    fireEvent.click(screen.getByText('英雄'));

    expect(onSelect).toHaveBeenCalledWith('hero');
  });

  it('点击外部区域触发 onClose', () => {
    const onClose = vi.fn();
    render(<CharacterDropdown {...baseProps({ onClose })} />);

    fireEvent.mouseDown(document.body);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('点击下拉框内部不触发 onClose', () => {
    const onClose = vi.fn();
    render(<CharacterDropdown {...baseProps({ onClose })} />);

    fireEvent.mouseDown(screen.getByText('英雄'));

    expect(onClose).not.toHaveBeenCalled();
  });

  it('没有头像时显示名称首字母', () => {
    render(<CharacterDropdown {...baseProps()} />);

    expect(screen.getByText('英')).toBeInTheDocument();
  });
});
