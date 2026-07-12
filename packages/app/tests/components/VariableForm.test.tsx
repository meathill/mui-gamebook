import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import VariableForm from '@/components/editor/variables/VariableForm';
import { defaultFormData } from '@/components/editor/variables/utils';

describe('VariableForm', () => {
  it('新建模式显示"新建变量"标题和创建按钮，编辑模式不显示创建按钮', () => {
    const { rerender } = render(
      <VariableForm
        formData={defaultFormData}
        isCreating
        onUpdate={vi.fn()}
        onSave={vi.fn()}
        sceneList={[]}
      />,
    );
    expect(screen.getByText('新建变量')).toBeInTheDocument();
    expect(screen.getByText('创建')).toBeInTheDocument();

    rerender(
      <VariableForm
        formData={defaultFormData}
        isCreating={false}
        onUpdate={vi.fn()}
        onSave={vi.fn()}
        sceneList={[]}
      />,
    );
    expect(screen.getByText('编辑变量')).toBeInTheDocument();
    expect(screen.queryByText('创建')).not.toBeInTheDocument();
  });

  it('变量名输入会把空格替换成下划线', () => {
    const onUpdate = vi.fn();
    render(
      <VariableForm
        formData={defaultFormData}
        isCreating
        onUpdate={onUpdate}
        onSave={vi.fn()}
        sceneList={[]}
      />,
    );

    const nameInput = screen.getByText('变量名').parentElement?.querySelector('input') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'my var' } });

    expect(onUpdate).toHaveBeenCalledWith({ name: 'my_var' });
  });

  it('切换类型为 boolean 时把初始值重置为 false', () => {
    const onUpdate = vi.fn();
    render(
      <VariableForm
        formData={defaultFormData}
        isCreating
        onUpdate={onUpdate}
        onSave={vi.fn()}
        sceneList={[]}
      />,
    );

    fireEvent.change(screen.getByDisplayValue('数字'), { target: { value: 'boolean' } });

    expect(onUpdate).toHaveBeenCalledWith({ valueType: 'boolean', value: 'false' });
  });

  it('display 为 progress 时显示最大值输入框，为 icon 时显示图标选择', () => {
    const { rerender } = render(
      <VariableForm
        formData={{ ...defaultFormData, visible: true, display: 'progress' }}
        isCreating={false}
        onUpdate={vi.fn()}
        onSave={vi.fn()}
        sceneList={[]}
      />,
    );
    expect(screen.getByText('最大值')).toBeInTheDocument();
    expect(screen.queryByText('选择图标')).not.toBeInTheDocument();

    rerender(
      <VariableForm
        formData={{ ...defaultFormData, visible: true, display: 'icon' }}
        isCreating={false}
        onUpdate={vi.fn()}
        onSave={vi.fn()}
        sceneList={[]}
      />,
    );
    expect(screen.queryByText('最大值')).not.toBeInTheDocument();
    expect(screen.getByText('选择图标')).toBeInTheDocument();
  });

  it('未勾选 visible 时不展示展示方式相关字段', () => {
    render(
      <VariableForm
        formData={{ ...defaultFormData, visible: false }}
        isCreating={false}
        onUpdate={vi.fn()}
        onSave={vi.fn()}
        sceneList={[]}
      />,
    );

    expect(screen.queryByText('展示方式')).not.toBeInTheDocument();
  });

  it('勾选触发器后显示触发条件和跳转场景字段，场景下拉列出传入的 sceneList', () => {
    render(
      <VariableForm
        formData={{ ...defaultFormData, hasTrigger: true }}
        isCreating={false}
        onUpdate={vi.fn()}
        onSave={vi.fn()}
        sceneList={['start', 'game_over']}
      />,
    );

    expect(screen.getByPlaceholderText('如: <= 0 或 == true')).toBeInTheDocument();
    expect(screen.getByText('start')).toBeInTheDocument();
    expect(screen.getByText('game_over')).toBeInTheDocument();
  });
});
