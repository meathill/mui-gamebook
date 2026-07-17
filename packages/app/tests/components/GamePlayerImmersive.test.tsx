import '@testing-library/jest-dom';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import GamePlayerImmersive from '../../src/components/game-player/GamePlayerImmersive';
import { DialogProvider } from '@/components/Dialog';
import type { PlayableGame } from '@mui-gamebook/parser/src/types';
import messages from '../../src/i18n/messages/en.json';

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <NextIntlClientProvider
      messages={messages}
      locale="en">
      <DialogProvider>{component}</DialogProvider>
    </NextIntlClientProvider>,
  );
};

const mockGame: PlayableGame = {
  slug: 'immersive-test',
  title: 'Immersive Adventure',
  description: 'A test game',
  initialState: {
    gold: 10,
    has_key: false,
  },
  startSceneId: 'start',
  scenes: {
    start: {
      id: 'start',
      nodes: [
        { type: 'text', content: 'You are at the start.' },
        { type: 'choice', text: 'Buy Key (Cost 5)', nextSceneId: 'shop', set: 'gold = gold - 5, has_key = true' },
        { type: 'choice', text: 'Go to Door', nextSceneId: 'door' },
      ],
    },
    shop: {
      id: 'shop',
      nodes: [
        { type: 'text', content: 'You bought the key.' },
        { type: 'choice', text: 'Back to Start', nextSceneId: 'start' },
      ],
    },
    door: {
      id: 'door',
      nodes: [
        { type: 'text', content: 'You are at the door.' },
        { type: 'choice', text: 'Unlock Door', nextSceneId: 'win', condition: 'has_key == true' },
        { type: 'choice', text: 'Go Back', nextSceneId: 'start' },
      ],
    },
    win: {
      id: 'win',
      nodes: [{ type: 'text', content: 'You Win!' }],
    },
  },
};

// ImmersiveTextBox 的整个可点击层用固定的 class 标记；每个只有单个文字节点的场景，
// 第一次点击让打字机瞬间打完，第二次点击才会推进/显示选项。查这个容器而不是具体文字，
// 因为文字内容在打字过程中是变化的（未打完时只有零宽空格）。
function advance(container: HTMLElement) {
  const box = container.querySelector('.cursor-pointer') as HTMLElement;
  fireEvent.click(box);
  fireEvent.click(box);
}

describe('GamePlayerImmersive Component', () => {
  it('should render the title screen and start game correctly', () => {
    const { container } = renderWithProviders(
      <GamePlayerImmersive
        game={mockGame}
        slug="immersive-test"
      />,
    );

    expect(screen.getAllByText('Immersive Adventure').length).toBeGreaterThan(0);
    expect(screen.getByText('Start Adventure')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Start Adventure'));
    // 打字机效果尚未打完前，只有零宽空格；点击一次让它立即打完
    fireEvent.click(container.querySelector('.cursor-pointer') as HTMLElement);

    expect(screen.getByText('You are at the start.')).toBeInTheDocument();
  });

  it('should reveal choices after finishing the scene text, and navigate on choice click', () => {
    const { container } = renderWithProviders(
      <GamePlayerImmersive
        game={mockGame}
        slug="immersive-test-2"
      />,
    );
    fireEvent.click(screen.getByText('Start Adventure'));

    expect(screen.queryByText('Buy Key (Cost 5)')).not.toBeInTheDocument();

    advance(container);

    expect(screen.getByText('Buy Key (Cost 5)')).toBeInTheDocument();
    expect(screen.getByText('Go to Door')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Buy Key (Cost 5)'));
    advance(container);

    expect(screen.getByText('You bought the key.')).toBeInTheDocument();
  });

  it('should handle conditional choices correctly', () => {
    const { container } = renderWithProviders(
      <GamePlayerImmersive
        game={mockGame}
        slug="immersive-test-3"
      />,
    );
    fireEvent.click(screen.getByText('Start Adventure'));
    advance(container);

    // 没有钥匙时前往门口
    fireEvent.click(screen.getByText('Go to Door'));
    advance(container);

    expect(screen.getByText('You are at the door.')).toBeInTheDocument();
    expect(screen.queryByText('Unlock Door')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Go Back'));
    advance(container);

    // 买钥匙
    fireEvent.click(screen.getByText('Buy Key (Cost 5)'));
    advance(container);
    fireEvent.click(screen.getByText('Back to Start'));
    advance(container);

    // 再次前往门口
    fireEvent.click(screen.getByText('Go to Door'));
    advance(container);

    expect(screen.getByText('Unlock Door')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Unlock Door'));

    // 'win' 场景没有 choice，一进入就直接展示结局画面（不经过打字机逐字展示）
    expect(screen.getByText('The End')).toBeInTheDocument();
  });

  it('should show the end screen when the scene has no choices', () => {
    const { container } = renderWithProviders(
      <GamePlayerImmersive
        game={mockGame}
        slug="immersive-test-4"
      />,
    );
    fireEvent.click(screen.getByText('Start Adventure'));
    advance(container);
    fireEvent.click(screen.getByText('Go to Door'));
    advance(container);
    fireEvent.click(screen.getByText('Go Back'));
    advance(container);
    fireEvent.click(screen.getByText('Buy Key (Cost 5)'));
    advance(container);
    fireEvent.click(screen.getByText('Back to Start'));
    advance(container);
    fireEvent.click(screen.getByText('Go to Door'));
    advance(container);
    fireEvent.click(screen.getByText('Unlock Door'));

    expect(screen.getByText('The End')).toBeInTheDocument();
    expect(screen.getByText('Play Again')).toBeInTheDocument();
  });
});
