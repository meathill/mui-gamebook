import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';
import CommentDialog from '@/components/game-player/CommentDialog';
import messages from '../../src/i18n/messages/en.json';

vi.mock('@/components/Comment', () => ({
  default: ({ postId }: { postId: string }) => <div data-testid="comment">comment:{postId}</div>,
}));

function renderDialog() {
  return render(
    <NextIntlClientProvider
      messages={messages}
      locale="en">
      <CommentDialog postId="lanxiang-otome" />
    </NextIntlClientProvider>,
  );
}

describe('CommentDialog', () => {
  it('平时只渲染按钮，不挂载评论组件', () => {
    renderDialog();

    expect(screen.getByRole('button', { name: 'Comments' })).toBeInTheDocument();
    expect(screen.queryByTestId('comment')).not.toBeInTheDocument();
  });

  it('点击按钮后挂载评论', () => {
    renderDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Comments' }));

    expect(screen.getByTestId('comment')).toHaveTextContent('comment:lanxiang-otome');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('点 X 关闭并卸载评论', () => {
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Comments' }));
    expect(screen.getByTestId('comment')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(screen.queryByTestId('comment')).not.toBeInTheDocument();
  });

  it('点遮罩关闭', () => {
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Comments' }));

    fireEvent.click(screen.getByRole('dialog'));

    expect(screen.queryByTestId('comment')).not.toBeInTheDocument();
  });

  it('按 Escape 关闭', () => {
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Comments' }));

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(screen.queryByTestId('comment')).not.toBeInTheDocument();
  });
});
