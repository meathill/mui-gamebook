import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GamePlayer from '../../src/components/GamePlayer';
import type { Game } from '@mui-gamebook/parser/src/types';

// Mock scrollIntoView
window.scrollTo = vi.fn();

const mockGame: Game = {
  title: 'Test Adventure',
  description: 'A test game',
  initialState: {
    gold: 10,
    has_key: false,
  },
  ai: {},
  published: true,
  startSceneId: 'start',
  scenes: new Map([
    ['start', {
      id: 'start',
      nodes: [
        { type: 'text', content: 'You are at the start.' },
        { type: 'choice', text: 'Buy Key (Cost 5)', nextSceneId: 'shop', set: 'gold = gold - 5, has_key = true' },
        { type: 'choice', text: 'Go to Door', nextSceneId: 'door' },
      ]
    }],
    ['shop', {
      id: 'shop',
      nodes: [
        { type: 'text', content: 'You bought the key.' },
        { type: 'choice', text: 'Back to Start', nextSceneId: 'start' },
      ]
    }],
    ['door', {
      id: 'door',
      nodes: [
        { type: 'text', content: 'You are at the door.' },
        { type: 'choice', text: 'Unlock Door', nextSceneId: 'win', condition: 'has_key == true' },
        { type: 'choice', text: 'Go Back', nextSceneId: 'start' },
      ]
    }],
    ['win', {
      id: 'win',
      nodes: [
        { type: 'text', content: 'You Win!' },
      ]
    }]
  ])
};

describe('GamePlayer Component', () => {
  it('should render the start scene correctly', () => {
    render(<GamePlayer game={mockGame} slug="test-game" />);
    
    expect(screen.getByText('Test Adventure')).toBeInTheDocument();
    expect(screen.getByText('You are at the start.')).toBeInTheDocument();
    expect(screen.getByText('Buy Key (Cost 5)')).toBeInTheDocument();
    expect(screen.getByText('Go to Door')).toBeInTheDocument();
  });

  it('should update state and navigate on choice click', () => {
    render(<GamePlayer game={mockGame} slug="test-game-2" />);
    
    // Click "Buy Key"
    fireEvent.click(screen.getByText('Buy Key (Cost 5)'));
    
    // Should navigate to shop
    expect(screen.getByText('You bought the key.')).toBeInTheDocument();
  });

  it('should handle conditional choices correctly', () => {
    render(<GamePlayer game={mockGame} slug="test-game-3" />);
    
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
