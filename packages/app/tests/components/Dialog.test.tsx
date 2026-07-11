import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DialogProvider, useDialog } from '@/components/Dialog';
import { act } from 'react';

// 一个测试用的消费组件，通过按钮触发 dialog
function TestComponent({
  action,
  message,
  title,
  onResolve,
}: {
  action: 'alert' | 'confirm' | 'success' | 'error';
  message: string;
  title?: string;
  onResolve?: (val: any) => void;
}) {
  const dialog = useDialog();
  const handleClick = async () => {
    let result: any;
    if (action === 'alert') {
      result = await dialog.alert(message, title);
    } else if (action === 'confirm') {
      result = await dialog.confirm(message, title);
    } else if (action === 'success') {
      result = await dialog.success(message, title);
    } else if (action === 'error') {
      result = await dialog.error(message, title);
    }
    onResolve?.(result);
  };
  return <button onClick={handleClick}>Trigger {action}</button>;
}

describe('Dialog 组件', () => {
  it('可以正确触发并展示 success 类型的 dialog，并点击确定关闭', async () => {
    let resolved = false;
    render(
      <DialogProvider>
        <TestComponent
          action="success"
          message="保存成功！"
          title="成功"
          onResolve={() => {
            resolved = true;
          }}
        />
      </DialogProvider>,
    );

    // 触发 Dialog
    fireEvent.click(screen.getByText('Trigger success'));

    // 应该在屏幕上看到弹窗内容
    expect(screen.getByText('成功')).toBeInTheDocument();
    expect(screen.getByText('保存成功！')).toBeInTheDocument();

    // 应该看到确定按钮，并且它是原生的 button 元素且具有对应的样式类
    const confirmBtn = screen.getByRole('button', { name: '确定' });
    expect(confirmBtn).toBeInTheDocument();
    expect(confirmBtn).toHaveAttribute('data-accent-color', 'green'); // Radix Theme green color

    // 点击确定按钮关闭 Dialog
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    // 弹窗应该关闭了，不再包含对应文字
    expect(screen.queryByText('保存成功！')).not.toBeInTheDocument();
    expect(resolved).toBe(true);
  });

  it('可以正确展示 confirm 类型的 dialog 并包含取消和确定两个按钮', async () => {
    let confirmResult: boolean | null = null;
    render(
      <DialogProvider>
        <TestComponent
          action="confirm"
          message="你确定要删除吗？"
          title="警告"
          onResolve={(val) => {
            confirmResult = val;
          }}
        />
      </DialogProvider>,
    );

    // 触发 Dialog
    fireEvent.click(screen.getByText('Trigger confirm'));

    expect(screen.getByText('警告')).toBeInTheDocument();
    expect(screen.getByText('你确定要删除吗？')).toBeInTheDocument();

    const cancelBtn = screen.getByRole('button', { name: '取消' });
    const confirmBtn = screen.getByRole('button', { name: '确定' });

    expect(cancelBtn).toBeInTheDocument();
    expect(confirmBtn).toBeInTheDocument();
    expect(confirmBtn).toHaveAttribute('data-accent-color', 'orange'); // Radix Theme orange color
    expect(cancelBtn).toHaveAttribute('data-accent-color', 'gray'); // Radix Theme gray color

    // 点击取消
    await act(async () => {
      fireEvent.click(cancelBtn);
    });

    expect(confirmResult).toBe(false);
    expect(screen.queryByText('你确定要删除吗？')).not.toBeInTheDocument();
  });
});
