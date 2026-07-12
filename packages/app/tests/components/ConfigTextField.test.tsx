import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConfigTextField } from '@/components/admin/ConfigTextField';

describe('ConfigTextField', () => {
  it('渲染 label 和当前值', () => {
    render(
      <ConfigTextField
        label="模型名称"
        value="gpt-4"
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText('模型名称')).toBeInTheDocument();
    expect(screen.getByDisplayValue('gpt-4')).toBeInTheDocument();
  });

  it('输入内容触发 onChange', () => {
    const onChange = vi.fn();
    render(
      <ConfigTextField
        label="模型名称"
        value=""
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByDisplayValue(''), { target: { value: 'claude-3' } });

    expect(onChange).toHaveBeenCalledWith('claude-3');
  });

  it('提供 hint 时展示说明文字，未提供时不渲染', () => {
    const { rerender } = render(
      <ConfigTextField
        label="Base URL"
        value=""
        onChange={vi.fn()}
        hint="留空使用默认地址"
      />,
    );
    expect(screen.getByText('留空使用默认地址')).toBeInTheDocument();

    rerender(
      <ConfigTextField
        label="Base URL"
        value=""
        onChange={vi.fn()}
      />,
    );
    expect(screen.queryByText('留空使用默认地址')).not.toBeInTheDocument();
  });
});
