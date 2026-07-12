import { NextIntlClientProvider } from 'next-intl';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import EndScreen from '@/components/game-player/EndScreen';
import messages from '../../src/i18n/messages/en.json';

vi.mock('@/components/ShareButton', () => ({
  default: ({ title }: { title: string }) => <div data-testid="share-button">{title}</div>,
}));

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider
      messages={messages}
      locale="en">
      {ui}
    </NextIntlClientProvider>,
  );
}

describe('EndScreen', () => {
  it('渲染结束语和感谢文案', () => {
    renderWithProviders(
      <EndScreen
        title="迷失之城"
        shareUrl="https://x.com/game/lost-city"
        onRestart={vi.fn()}
      />,
    );

    expect(screen.getByText('The End')).toBeInTheDocument();
    expect(screen.getByText('Thanks for playing!')).toBeInTheDocument();
  });

  it('点击"再玩一次"以 noConfirm=true 调用 onRestart', () => {
    const onRestart = vi.fn();
    renderWithProviders(
      <EndScreen
        title="迷失之城"
        shareUrl="https://x.com/game/lost-city"
        onRestart={onRestart}
      />,
    );

    fireEvent.click(screen.getByText('Play Again'));

    expect(onRestart).toHaveBeenCalledWith(true);
  });

  it('"返回首页"链接指向 /', () => {
    renderWithProviders(
      <EndScreen
        title="迷失之城"
        shareUrl="https://x.com/game/lost-city"
        onRestart={vi.fn()}
      />,
    );

    expect(screen.getByText('Back to Library').closest('a')).toHaveAttribute('href', '/');
  });

  it('渲染分享区块，传入正确的 title', () => {
    renderWithProviders(
      <EndScreen
        title="迷失之城"
        shareUrl="https://x.com/game/lost-city"
        onRestart={vi.fn()}
      />,
    );

    expect(screen.getByText('Enjoyed this story? Share it with friends!')).toBeInTheDocument();
    expect(screen.getByTestId('share-button')).toHaveTextContent('迷失之城');
  });
});
