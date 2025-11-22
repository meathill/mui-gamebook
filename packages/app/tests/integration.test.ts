import { describe, it, expect } from 'vitest';
import { getPublishedGames, getGameBySlug } from '../src/lib/games';

describe('Game Library Integration', () => {
  it('getPublishedGames should return only published games', () => {
    const games = getPublishedGames();
    const slugs = games.map(g => g.slug);

    // Should include hello_world (published: true)
    expect(slugs).toContain('hello_world');

    // Should NOT include not-published (published: false)
    expect(slugs).not.toContain('not-published');
  });

  it('getGameBySlug should return data for published game', () => {
    const game = getGameBySlug('hello_world');
    expect(game).not.toBeNull();
    expect(game?.title).toBe('Hello World Game');
  });

  it('getGameBySlug should return null for unpublished game', () => {
    const game = getGameBySlug('not-published');
    expect(game).toBeNull();
  });

  it('getGameBySlug should return null for non-existent game', () => {
    const game = getGameBySlug('non-existent-game-123');
    expect(game).toBeNull();
  });
});
