import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { Theme } from '@radix-ui/themes';
import GamePlayer from '../../src/components/GamePlayer';
import { DialogProvider } from '@/components/Dialog';
import type { PlayableGame } from '@mui-gamebook/parser/src/types';
import messages from '../../src/i18n/messages/en.json';

// Mock scrollIntoView
window.scrollTo = vi.fn();

// Mock MiniGamePlayer to control completion
vi.mock('@/components/game-player', async () => {
  const actual = await vi.importActual('@/components/game-player');
  return {
    ...actual,
    MiniGamePlayer: ({ onComplete }: { onComplete: (vars: any) => void }) => (
      <div data-testid="minigame-mock">
        <button onClick={() => onComplete({ score: 100 })}>Complete Minigame</button>
      </div>
    ),
  };
});

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <Theme>
      <NextIntlClientProvider messages={messages} locale="en">
        <DialogProvider>{component}</DialogProvider>
      </NextIntlClientProvider>
    </Theme>
  );
};

const mockGameWithMinigame: PlayableGame = {
  slug: 'minigame-test',
  title: 'Minigame Adventure',
  description: 'Test minigame logic',
  initialState: { score: 0 },
  startSceneId: 'start',
  scenes: {
    start: {
      id: 'start',
      nodes: [
        { type: 'text', content: 'Start scene' },
        { type: 'minigame', url: 'http://example.com/game.js', variables: ['score'] },
        { type: 'choice', text: 'Next Step', nextSceneId: 'end' },
      ],
    },
    end: {
      id: 'end',
      nodes: [{ type: 'text', content: 'The End' }],
    },
  },
};

describe('GamePlayer Minigame Logic', () => {
  it('should not show choices until minigame is completed', async () => {
    renderWithProviders(<GamePlayer game={mockGameWithMinigame} slug="minigame-test" />);

    // Start game
    fireEvent.click(screen.getByText('Start Adventure'));

    // Minigame should be visible
    expect(screen.getByTestId('minigame-mock')).toBeInTheDocument();

    // Choice "Next Step" should NOT be visible
    expect(screen.queryByText('Next Step')).not.toBeInTheDocument();

    // Complete minigame
    fireEvent.click(screen.getByText('Complete Minigame'));

    // Choice "Next Step" SHOULD be visible now
    await waitFor(() => {
      expect(screen.getByText('Next Step')).toBeInTheDocument();
    });
  });
});
