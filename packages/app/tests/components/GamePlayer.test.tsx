import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import GamePlayer from '../../src/components/GamePlayer';
import { DialogProvider } from '../../src/components/Dialog';
import type { SerializablePlayableGame } from '@mui-gamebook/parser/src/types';
import messages from '../../src/i18n/messages/en.json';

// Mock scrollIntoView
window.scrollTo = vi.fn();

// Helper to render with DialogProvider and NextIntlClientProvider
const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <NextIntlClientProvider messages={messages} locale="en">
      <DialogProvider>{component}</DialogProvider>
    </NextIntlClientProvider>
  );
};

const mockGame: SerializablePlayableGame = {
  slug: 'test-game',
  title: 'Test Adventure',
  description: 'A test game',
  initialState: {
    gold: 10,
    has_key: false,
  },
  startSceneId: 'start',
  scenes: {
    'start': {
      id: 'start',
      nodes: [
        { type: 'text', content: 'You are at the start.' },
        { type: 'choice', text: 'Buy Key (Cost 5)', nextSceneId: 'shop', set: 'gold = gold - 5, has_key = true' },
        { type: 'choice', text: 'Go to Door', nextSceneId: 'door' },
      ]
    },
    'shop': {
      id: 'shop',
      nodes: [
        { type: 'text', content: 'You bought the key.' },
        { type: 'choice', text: 'Back to Start', nextSceneId: 'start' },
      ]
    },
    'door': {
      id: 'door',
      nodes: [
        { type: 'text', content: 'You are at the door.' },
        { type: 'choice', text: 'Unlock Door', nextSceneId: 'win', condition: 'has_key == true' },
        { type: 'choice', text: 'Go Back', nextSceneId: 'start' },
      ]
    },
    'win': {
      id: 'win',
      nodes: [
        { type: 'text', content: 'You Win!' },
      ]
    }
  }
};

describe('GamePlayer Component', () => {
  it('should render the title screen and start game correctly', () => {
    renderWithProviders(<GamePlayer game={mockGame} slug="test-game" />);
    
    // 检查标题页
    expect(screen.getAllByText('Test Adventure').length).toBeGreaterThan(0);
    expect(screen.getByText('A test game')).toBeInTheDocument();
    expect(screen.getByText('Start Adventure')).toBeInTheDocument();
    
    // 点击开始
    fireEvent.click(screen.getByText('Start Adventure'));
    
    // 现在应该看到游戏内容
    expect(screen.getByText('You are at the start.')).toBeInTheDocument();
    expect(screen.getByText('Buy Key (Cost 5)')).toBeInTheDocument();
    expect(screen.getByText('Go to Door')).toBeInTheDocument();
  });

  it('should update state and navigate on choice click', () => {
    renderWithProviders(<GamePlayer game={mockGame} slug="test-game-2" />);
    
    // 开始游戏
    fireEvent.click(screen.getByText('Start Adventure'));
    
    // Click "Buy Key"
    fireEvent.click(screen.getByText('Buy Key (Cost 5)'));
    
    // Should navigate to shop
    expect(screen.getByText('You bought the key.')).toBeInTheDocument();
  });

  it('should handle conditional choices correctly', () => {
    renderWithProviders(<GamePlayer game={mockGame} slug="test-game-3" />);
    
    // 开始游戏
    fireEvent.click(screen.getByText('Start Adventure'));
    
    // Go to door without key
    fireEvent.click(screen.getByText('Go to Door'));
    
    // Should be at door
    expect(screen.getByText('You are at the door.')).toBeInTheDocument();
    
    // "Unlock Door" should NOT be visible because has_key is false
    expect(screen.queryByText('Unlock Door')).not.toBeInTheDocument();
    
    // Go back
    fireEvent.click(screen.getByText('Go Back'));
    
    // Buy key
    fireEvent.click(screen.getByText('Buy Key (Cost 5)'));
    fireEvent.click(screen.getByText('Back to Start'));
    
    // Go to door again
    fireEvent.click(screen.getByText('Go to Door'));
    
    // "Unlock Door" SHOULD be visible now
    expect(screen.getByText('Unlock Door')).toBeInTheDocument();
    
    // Click it to win
    fireEvent.click(screen.getByText('Unlock Door'));
    expect(screen.getByText('You Win!')).toBeInTheDocument();
  });
});
