import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import VariableList from '@/components/editor/variables/VariableList';

describe('VariableList', () => {
  it('没有变量且没有搜索词时显示"暂无变量"', () => {
    render(
      <VariableList
        variables={[]}
        selectedVar={null}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        searchQuery=""
      />,
    );

    expect(screen.getByText('暂无变量')).toBeInTheDocument();
  });

  it('搜索无结果时显示"无匹配变量"', () => {
    render(
      <VariableList
        variables={[]}
        selectedVar={null}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        searchQuery="xyz"
      />,
    );

    expect(screen.getByText('无匹配变量')).toBeInTheDocument();
  });

  it('列出变量名和显示值', () => {
    render(
      <VariableList
        variables={[
          ['gold', 100],
          ['hp', { value: 80, visible: true }],
        ]}
        selectedVar={null}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        searchQuery=""
      />,
    );

    expect(screen.getByText('gold')).toBeInTheDocument();
    expect(screen.getByText('= 100')).toBeInTheDocument();
    expect(screen.getByText('= 80')).toBeInTheDocument();
  });

  it('点击条目触发 onSelect，点击删除按钮触发 onDelete 且不冒泡到 onSelect', () => {
    const onSelect = vi.fn();
    const onDelete = vi.fn();
    render(
      <VariableList
        variables={[['gold', 100]]}
        selectedVar={null}
        onSelect={onSelect}
        onDelete={onDelete}
        searchQuery=""
      />,
    );

    fireEvent.click(screen.getByText('gold'));
    expect(onSelect).toHaveBeenCalledWith('gold');

    fireEvent.click(screen.getByRole('button'));
    expect(onDelete).toHaveBeenCalledWith('gold');
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
