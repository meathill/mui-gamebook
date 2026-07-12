import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CharacterList from '@/components/editor/characters/CharacterList';

const HERO = { name: '英雄', description: '', image_prompt: '', image_url: '' };

describe('CharacterList', () => {
  it('没有角色且没有搜索词时提示创建', () => {
    render(
      <CharacterList
        characters={[]}
        selectedId={null}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        searchQuery=""
      />,
    );

    expect(screen.getByText('暂无角色，点击 + 创建')).toBeInTheDocument();
  });

  it('搜索无结果时显示"未找到匹配的角色"', () => {
    render(
      <CharacterList
        characters={[]}
        selectedId={null}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        searchQuery="x"
      />,
    );

    expect(screen.getByText('未找到匹配的角色')).toBeInTheDocument();
  });

  it('列出角色名和 ID，没有头像时显示名称首字母', () => {
    render(
      <CharacterList
        characters={[['hero', HERO]]}
        selectedId={null}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        searchQuery=""
      />,
    );

    expect(screen.getByText('英雄')).toBeInTheDocument();
    expect(screen.getByText('hero')).toBeInTheDocument();
    expect(screen.getByText('英')).toBeInTheDocument();
  });

  it('点击条目触发 onSelect，点击删除按钮触发 onDelete 且不冒泡', () => {
    const onSelect = vi.fn();
    const onDelete = vi.fn();
    render(
      <CharacterList
        characters={[['hero', HERO]]}
        selectedId={null}
        onSelect={onSelect}
        onDelete={onDelete}
        searchQuery=""
      />,
    );

    fireEvent.click(screen.getByText('英雄'));
    expect(onSelect).toHaveBeenCalledWith('hero');

    fireEvent.click(screen.getByTitle('删除角色'));
    expect(onDelete).toHaveBeenCalledWith('hero');
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
