import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import TypewriterSpeedField from '@/components/editor/TypewriterSpeedField';

describe('TypewriterSpeedField', () => {
  it('允许输入中暂时为空，父组件重渲染时也不会回填', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <TypewriterSpeedField
        value={60}
        onChange={onChange}
      />,
    );
    const input = screen.getByRole('spinbutton');

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '' } });
    rerender(
      <TypewriterSpeedField
        value={60}
        onChange={vi.fn()}
      />,
    );

    expect(input).toHaveValue(null);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('合法的 10–200 数值会实时提交', () => {
    const onChange = vi.fn();
    render(
      <TypewriterSpeedField
        value={40}
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '85' } });

    expect(onChange).toHaveBeenCalledWith(85);
  });

  it('失焦时将空值恢复为最后提交值，缺省时恢复为 40', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <TypewriterSpeedField
        value={75}
        onChange={onChange}
      />,
    );
    const input = screen.getByRole('spinbutton');

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);
    expect(input).toHaveValue(75);

    rerender(
      <TypewriterSpeedField
        value={undefined}
        onChange={onChange}
      />,
    );
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);
    expect(input).toHaveValue(40);
  });

  it.each([
    ['5', 10],
    ['500', 200],
  ])('失焦时将 %s 归一到边界 %d', (rawValue, expectedValue) => {
    const onChange = vi.fn();
    render(
      <TypewriterSpeedField
        value={40}
        onChange={onChange}
      />,
    );
    const input = screen.getByRole('spinbutton');

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: rawValue } });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.blur(input);

    expect(input).toHaveValue(expectedValue);
    expect(onChange).toHaveBeenCalledWith(expectedValue);
  });
});
