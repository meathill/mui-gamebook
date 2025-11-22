import { describe, it, expect } from 'vitest';
import { getPublishedGames, getGameBySlug } from '../src/lib/games';

describe('Game Library Integration', () => {
  it('getPublishedGames should return only published games', async () => {
    const games = await getPublishedGames();
    const slugs = games.map(g => g.slug);

    // Should include hello_world (published: true)
    expect(slugs).toContain('hello_world');

    // Should NOT include not-published (published: false)
    expect(slugs).not.toContain('not-published');
  });

  it('getGameBySlug should return data for published game', async () => {
    const game = await getGameBySlug('hello_world');
    expect(game).not.toBeNull();
    expect(game?.title).toBe('Hello World Game');
  });

  it('getGameBySlug should return null for unpublished game', async () => {
    const game = await getGameBySlug('not-published');
    expect(game).toBeNull();
  });

  it('getGameBySlug should return null for non-existent game', async () => {
    const game = await getGameBySlug('non-existent-game-123');
    expect(game).toBeNull();
  });
});
