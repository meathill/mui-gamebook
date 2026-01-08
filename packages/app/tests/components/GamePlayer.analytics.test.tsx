import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GamePlayer from '../../src/components/GamePlayer';
import { Theme } from '@radix-ui/themes';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PlayableGame } from '@mui-gamebook/parser/src/types';

// Mock useGameAnalytics hook
const mockTrackOpen = vi.fn();
const mockTrackScene = vi.fn();
const mockTrackChoice = vi.fn();
const mockTrackComplete = vi.fn();

vi.mock('../../src/hooks/useGameAnalytics', () => ({
  useGameAnalytics: () => ({
    trackOpen: mockTrackOpen,
    trackScene: mockTrackScene,
    trackChoice: mockTrackChoice,
    trackComplete: mockTrackComplete,
  }),
}));

// Mock other hooks
vi.mock('../../src/hooks/useAudioPlayer', () => ({
  useAudioPlayer: () => ({
    play: vi.fn(),
    stop: vi.fn(),
  }),
}));

vi.mock('../../src/components/Dialog', () => ({
  useDialog: () => ({
    confirm: vi.fn(),
  }),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const mockGame: PlayableGame & { id: number } = {
  id: 123,
  slug: 'test-game',
  title: 'Test Game',
  description: 'A test game',
  startSceneId: 'start',
  initialState: {
    hp: 100,
  },
  scenes: {
    start: {
      id: 'start',
      nodes: [
        { type: 'text', content: 'Start Scene' },
        { type: 'choice', text: 'Go Next', nextSceneId: 'next-scene', condition: 'true' },
      ],
    },
    'next-scene': {
      id: 'next-scene',
      nodes: [{ type: 'text', content: 'Next Scene' }],
    },
  },
};

describe('GamePlayer Analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('tracks game open on mount', () => {
    render(
      <Theme>
        <GamePlayer
          game={mockGame}
          slug="test-game"
        />
      </Theme>,
    );
    expect(mockTrackOpen).toHaveBeenCalledWith(123);
  });

  it('tracks scene visit on mount', async () => {
    render(
      <Theme>
        <GamePlayer
          game={mockGame}
          slug="test-game"
        />
      </Theme>,
    );

    // Start the game
    fireEvent.click(screen.getByText('startAdventure'));

    await waitFor(() => {
      expect(mockTrackScene).toHaveBeenCalledWith(123, 'start');
    });
  });

  it('tracks choice selection', async () => {
    render(
      <Theme>
        <GamePlayer
          game={mockGame}
          slug="test-game"
        />
      </Theme>,
    );

    // Find and click the choice button
    // Note: The text might be wrapped or interpolated, so we look for the button text

    // Start the game
    fireEvent.click(screen.getByText('startAdventure'));

    // Find and click the choice button
    const choiceButton = await screen.findByText('Go Next');
    fireEvent.click(choiceButton);

    expect(mockTrackChoice).toHaveBeenCalledWith(123, 'start', 1);
  });

  it('tracks new scene visit after choice', async () => {
    render(
      <Theme>
        <GamePlayer
          game={mockGame}
          slug="test-game"
        />
      </Theme>,
    );

    // Start the game
    fireEvent.click(screen.getByText('startAdventure'));

    const choiceButton = await screen.findByText('Go Next');
    fireEvent.click(choiceButton);

    await waitFor(() => {
      // Should track the new scene
      expect(mockTrackScene).toHaveBeenCalledWith(123, 'next-scene');
    });
  });

  it('tracks completion when end screen is shown', async () => {
    // Game ending scene
    const endMockGame: PlayableGame & { id: number } = {
      ...mockGame,
      scenes: {
        start: {
          id: 'start',
          nodes: [{ type: 'text', content: 'The End' }],
        },
      },
    };

    render(
      <Theme>
        <GamePlayer
          game={endMockGame}
          slug="test-game-complete"
        />
      </Theme>,
    );

    // Start the game
    fireEvent.click(screen.getByText('startAdventure'));

    // Since there are no choices, it should show end screen
    await waitFor(() => {
      expect(mockTrackComplete).toHaveBeenCalledWith(123);
    });
  });
});
