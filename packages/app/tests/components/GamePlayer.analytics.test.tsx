import { PlayableGame } from '@roudanio/parser/src/types';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GamePlayer from '../../src/components/GamePlayer';

vi.mock('@mui-gamebook/site-common/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@mui-gamebook/site-common/utils')>();
  return {
    ...actual,
    trackStartReading: vi.fn(),
    trackCompleteReading: vi.fn(),
    trackSceneView: vi.fn(),
    trackChoiceClick: vi.fn(),
  };
});

vi.mock('../../src/components/Dialog', () => ({
  useDialog: () => ({
    confirm: vi.fn(),
  }),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'zh',
}));

import {
  trackChoiceClick,
  trackCompleteReading,
  trackSceneView,
  trackStartReading,
} from '@mui-gamebook/site-common/utils';

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

describe('GamePlayer GA events', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('进入游玩视图时发送 start_reading', async () => {
    render(
      <GamePlayer
        game={mockGame}
        slug="test-game"
      />,
    );

    fireEvent.click(screen.getByText('startAdventure'));

    await waitFor(() => {
      expect(trackStartReading).toHaveBeenCalledWith({ gameId: 123, slug: 'test-game' });
    });
  });

  it('到达场景时发送 scene_view', async () => {
    render(
      <GamePlayer
        game={mockGame}
        slug="test-game"
      />,
    );

    fireEvent.click(screen.getByText('startAdventure'));

    await waitFor(() => {
      expect(trackSceneView).toHaveBeenCalledWith({ gameId: 123, slug: 'test-game', sceneId: 'start' });
    });
  });

  it('点击选项时发送 choice_click', async () => {
    render(
      <GamePlayer
        game={mockGame}
        slug="test-game"
      />,
    );

    fireEvent.click(screen.getByText('startAdventure'));

    const choiceButton = await screen.findByText('Go Next');
    fireEvent.click(choiceButton);

    expect(trackChoiceClick).toHaveBeenCalledWith({
      gameId: 123,
      slug: 'test-game',
      sceneId: 'start',
      choiceIndex: 1,
    });
  });

  it('进入下一个场景时再次发送 scene_view', async () => {
    render(
      <GamePlayer
        game={mockGame}
        slug="test-game"
      />,
    );

    fireEvent.click(screen.getByText('startAdventure'));

    const choiceButton = await screen.findByText('Go Next');
    fireEvent.click(choiceButton);

    await waitFor(() => {
      expect(trackSceneView).toHaveBeenCalledWith({ gameId: 123, slug: 'test-game', sceneId: 'next-scene' });
    });
  });

  it('到达结局时发送 complete_reading', async () => {
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
      <GamePlayer
        game={endMockGame}
        slug="test-game-complete"
      />,
    );

    fireEvent.click(screen.getByText('startAdventure'));

    await waitFor(() => {
      expect(trackCompleteReading).toHaveBeenCalledWith({ gameId: 123, slug: 'test-game-complete' });
    });
  });
});
