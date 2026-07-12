import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FormActions, FormField, SelectField } from '@/components/editor/SceneMetadataForm';

describe('FormField', () => {
  it('multiline 时渲染 textarea，否则渲染 input', () => {
    const { rerender } = render(
      <FormField
        label="描述"
        value="x"
        onChange={vi.fn()}
        multiline
      />,
    );
    expect(document.querySelector('textarea')).toBeInTheDocument();

    rerender(
      <FormField
        label="描述"
        value="x"
        onChange={vi.fn()}
      />,
    );
    expect(document.querySelector('input')).toBeInTheDocument();
    expect(document.querySelector('textarea')).not.toBeInTheDocument();
  });

  it('autoFocus 时挂载后自动聚焦', () => {
    render(
      <FormField
        label="描述"
        value=""
        onChange={vi.fn()}
        autoFocus
      />,
    );

    expect(document.querySelector('input')).toHaveFocus();
  });

  it('输入变化时调用 onChange', () => {
    const onChange = vi.fn();
    render(
      <FormField
        label="描述"
        value=""
        onChange={onChange}
      />,
    );

    fireEvent.change(document.querySelector('input') as HTMLInputElement, { target: { value: '新内容' } });

    expect(onChange).toHaveBeenCalledWith('新内容');
  });
});

describe('SelectField', () => {
  it('渲染所有选项并回显当前值', () => {
    render(
      <SelectField
        label="类型"
        value="b"
        onChange={vi.fn()}
        options={[
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B' },
        ]}
      />,
    );

    expect(screen.getByDisplayValue('B')).toBeInTheDocument();
  });

  it('切换选项时调用 onChange', () => {
    const onChange = vi.fn();
    render(
      <SelectField
        label="类型"
        value="a"
        onChange={onChange}
        options={[
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B' },
        ]}
      />,
    );

    fireEvent.change(screen.getByDisplayValue('A'), { target: { value: 'b' } });

    expect(onChange).toHaveBeenCalledWith('b');
  });
});

describe('FormActions', () => {
  it('点击保存/取消触发对应回调', () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    render(
      <FormActions
        onSave={onSave}
        onCancel={onCancel}
      />,
    );

    fireEvent.click(screen.getByText('保存'));
    fireEvent.click(screen.getByText('取消'));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
