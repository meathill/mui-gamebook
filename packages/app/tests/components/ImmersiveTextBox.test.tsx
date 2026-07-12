import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ImmersiveTextBox from '@/components/game-player/ImmersiveTextBox';

const typewriterState = {
  displayed: '',
  isComplete: false,
};
const completeMock = vi.fn(() => {
  typewriterState.isComplete = true;
});

vi.mock('@/components/game-player/hooks/useTypewriter', () => ({
  useTypewriter: (text: string) => ({
    displayed: typewriterState.displayed,
    isComplete: typewriterState.isComplete,
    complete: completeMock,
    reset: vi.fn(),
  }),
}));

function baseProps(overrides: Record<string, unknown> = {}) {
  return {
    paragraphs: ['第一段已经打完了。', '第二段正在打字中'],
    position: 'bottom' as const,
    showContinueHint: true,
    onAdvance: vi.fn(),
    ...overrides,
  };
}

describe('ImmersiveTextBox', () => {
  beforeEach(() => {
    typewriterState.displayed = '第二段正在打字中';
    typewriterState.isComplete = false;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('渲染前面段落（半透明）和当前逐字段落', () => {
    render(<ImmersiveTextBox {...baseProps()} />);

    expect(screen.getByText('第一段已经打完了。').parentElement).toHaveClass('opacity-70');
    expect(screen.getByText('第二段正在打字中')).toBeInTheDocument();
  });

  it('未打完时显示光标闪烁效果，不显示"继续"提示', () => {
    typewriterState.isComplete = false;
    const { container } = render(<ImmersiveTextBox {...baseProps()} />);

    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    expect(screen.queryByText('点击任意处继续 ▼')).not.toBeInTheDocument();
  });

  it('打完且 showContinueHint 时显示"继续"提示', () => {
    typewriterState.isComplete = true;
    render(<ImmersiveTextBox {...baseProps({ showContinueHint: true })} />);

    expect(screen.getByText('点击任意处继续 ▼')).toBeInTheDocument();
  });

  it('打完但 showContinueHint 为 false 时不显示提示', () => {
    typewriterState.isComplete = true;
    render(<ImmersiveTextBox {...baseProps({ showContinueHint: false })} />);

    expect(screen.queryByText('点击任意处继续 ▼')).not.toBeInTheDocument();
  });

  it('未打完时点击任意处调用 complete() 而不是 onAdvance()', () => {
    typewriterState.isComplete = false;
    const onAdvance = vi.fn();
    const { container } = render(<ImmersiveTextBox {...baseProps({ onAdvance })} />);

    fireEvent.click(container.firstChild as Element);

    expect(completeMock).toHaveBeenCalledTimes(1);
    expect(onAdvance).not.toHaveBeenCalled();
  });

  it('已打完时点击任意处调用 onAdvance() 而不是 complete()', () => {
    typewriterState.isComplete = true;
    const onAdvance = vi.fn();
    const { container } = render(<ImmersiveTextBox {...baseProps({ onAdvance })} />);

    fireEvent.click(container.firstChild as Element);

    expect(onAdvance).toHaveBeenCalledTimes(1);
    expect(completeMock).not.toHaveBeenCalled();
  });

  it('按下普通按键效果与点击一致（未打完→complete，已打完→onAdvance）', () => {
    typewriterState.isComplete = false;
    const onAdvance = vi.fn();
    render(<ImmersiveTextBox {...baseProps({ onAdvance })} />);

    fireEvent.keyDown(document.body, { key: 'a' });

    expect(completeMock).toHaveBeenCalledTimes(1);
    expect(onAdvance).not.toHaveBeenCalled();
  });

  it('按下 Escape 键不触发 complete 也不触发 onAdvance', () => {
    const onAdvance = vi.fn();
    render(<ImmersiveTextBox {...baseProps({ onAdvance })} />);

    fireEvent.keyDown(document.body, { key: 'Escape' });

    expect(completeMock).not.toHaveBeenCalled();
    expect(onAdvance).not.toHaveBeenCalled();
  });

  it('焦点在输入框内按键时忽略，不触发推进', () => {
    typewriterState.isComplete = true;
    const onAdvance = vi.fn();
    render(
      <div>
        <input data-testid="some-input" />
        <ImmersiveTextBox {...baseProps({ onAdvance })} />
      </div>,
    );

    fireEvent.keyDown(screen.getByTestId('some-input'), { key: 'a' });

    expect(onAdvance).not.toHaveBeenCalled();
    expect(completeMock).not.toHaveBeenCalled();
  });

  it('渲染 children', () => {
    render(
      <ImmersiveTextBox {...baseProps()}>
        <div data-testid="extra-child">额外内容</div>
      </ImmersiveTextBox>,
    );

    expect(screen.getByTestId('extra-child')).toBeInTheDocument();
  });
});
