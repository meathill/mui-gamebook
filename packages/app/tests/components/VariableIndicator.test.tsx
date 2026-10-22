import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import VariableIndicator from '../../src/components/game-player/VariableIndicator';
import type { VariableMeta } from '@roudanio/parser/src/types';

describe('VariableIndicator Component', () => {
  it('should render progress bar mode correctly', () => {
    const meta: VariableMeta = {
      value: 100,
      visible: true,
      display: 'progress',
      max: 100,
      label: '生命值',
    };

    render(
      <VariableIndicator
        varKey="health"
        meta={meta}
        currentValue={80}
      />,
    );

    // Verify label and progress text are rendered
    expect(screen.getByText('生命值')).toBeInTheDocument();
    expect(screen.getByText('80/100')).toBeInTheDocument();
  });

  it('进度条使用固定细条轨道，名称和数值独立展示', () => {
    render(
      <VariableIndicator
        varKey="courage"
        meta={{ value: 30, display: 'progress', max: 100, label: '勇气值' }}
        currentValue={30}
      />,
    );

    const bar = screen.getByRole('progressbar', { name: '勇气值' });
    expect(bar).toHaveClass('h-1.5');
    expect(bar).toHaveAttribute('aria-valuenow', '30');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
    expect(bar.firstElementChild).toHaveStyle({ width: '30%' });
    expect(bar).not.toContainElement(screen.getByText('30/100'));
  });

  it('should handle undefined values gracefully in progress bar mode', () => {
    const meta: VariableMeta = {
      value: 100,
      visible: true,
      display: 'progress',
      max: 100,
      label: '生命值',
    };

    render(
      <VariableIndicator
        varKey="health"
        meta={meta}
        currentValue={undefined}
      />,
    );

    expect(screen.getByText('生命值')).toBeInTheDocument();
    expect(screen.getByText('0/100')).toBeInTheDocument();
  });

  it('should render icon mode correctly', () => {
    const meta: VariableMeta = {
      value: false,
      visible: true,
      display: 'icon',
      icon: '🔑',
      label: '钥匙',
    };

    const { rerender } = render(
      <VariableIndicator
        varKey="has_key"
        meta={meta}
        currentValue={false}
      />,
    );

    expect(screen.getByText('钥匙')).toBeInTheDocument();
    expect(screen.getByText('🔑')).toHaveClass('opacity-30');

    rerender(
      <VariableIndicator
        varKey="has_key"
        meta={meta}
        currentValue={true}
      />,
    );

    expect(screen.getByText('🔑')).toHaveClass('opacity-100');
  });

  it('should render value mode correctly by default', () => {
    const meta: VariableMeta = {
      value: 10,
      visible: true,
      display: 'value',
      label: '金币',
    };

    render(
      <VariableIndicator
        varKey="gold"
        meta={meta}
        currentValue={15}
      />,
    );

    expect(screen.getByText('金币:')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
  });
});
