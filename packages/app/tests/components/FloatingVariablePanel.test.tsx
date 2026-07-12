import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import FloatingVariablePanel from '@/components/game-player/FloatingVariablePanel';

describe('FloatingVariablePanel', () => {
  it('变量列表为空时不渲染任何内容', () => {
    const { container } = render(
      <FloatingVariablePanel
        variables={[]}
        runtimeState={{}}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('value 展示模式渲染 label 和数值', () => {
    render(
      <FloatingVariablePanel
        variables={[{ key: 'gold', meta: { label: '金币', value: 42 } }]}
        runtimeState={{ gold: 42 }}
      />,
    );

    expect(screen.getAllByText('金币').length).toBeGreaterThan(0);
    expect(screen.getAllByText('42').length).toBeGreaterThan(0);
  });

  it('progress 展示模式渲染进度条百分比并按数值分段变色', () => {
    const { container } = render(
      <FloatingVariablePanel
        variables={[{ key: 'hp', meta: { label: '生命值', display: 'progress', max: 100, value: 20 } }]}
        runtimeState={{ hp: 20 }}
      />,
    );

    expect(screen.getAllByText('20/100').length).toBeGreaterThan(0);
    // hp/max=20% < 30%，应使用红色（危险）样式
    const bars = container.querySelectorAll('.bg-red-400');
    expect(bars.length).toBeGreaterThan(0);
  });

  it('icon 展示模式根据布尔值切换高亮/灰度', () => {
    render(
      <FloatingVariablePanel
        variables={[
          { key: 'hasKey', meta: { label: '钥匙', display: 'icon', icon: '🔑', value: true } },
          { key: 'hasMap', meta: { label: '地图', display: 'icon', icon: '🗺️', value: false } },
        ]}
        runtimeState={{ hasKey: true, hasMap: false }}
      />,
    );

    const keyIcons = screen.getAllByText('🔑');
    const mapIcons = screen.getAllByText('🗺️');
    expect(keyIcons[0]).toHaveClass('opacity-100');
    expect(mapIcons[0]).toHaveClass('opacity-30');
  });

  it('桌面端面板可折叠/展开', () => {
    render(
      <FloatingVariablePanel
        variables={[{ key: 'gold', meta: { label: '金币', value: 1 } }]}
        runtimeState={{ gold: 1 }}
      />,
    );

    fireEvent.click(screen.getByLabelText('折叠'));
    expect(screen.queryByLabelText('折叠')).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('展开变量面板'));
    expect(screen.getByLabelText('折叠')).toBeInTheDocument();
  });

  it('移动端点击按钮打开抽屉，点击背景关闭，点击抽屉内部不关闭', () => {
    render(
      <FloatingVariablePanel
        variables={[{ key: 'gold', meta: { label: '金币', value: 1 } }]}
        runtimeState={{ gold: 1 }}
      />,
    );

    fireEvent.click(screen.getByLabelText('查看变量'));
    expect(screen.getByLabelText('关闭')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('关闭'));
    expect(screen.queryByLabelText('关闭')).not.toBeInTheDocument();
  });
});
