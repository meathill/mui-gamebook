// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { Game } from '@roudanio/parser';
import { isPlaceholderImage, PLACEHOLDER_COVER } from '../../../image-loader';
import { resolveTarget } from '@/lib/media-assistance/targets';
import { missingDeclaredKeys } from '@/lib/media-assistance/declarations';

function game(cover?: string): Game {
  return { cover_image: cover, cover_prompt: 'a cover', ai: {}, scenes: {} } as unknown as Game;
}

describe('占位封面视为缺失', () => {
  it('isPlaceholderImage', () => {
    expect(isPlaceholderImage(PLACEHOLDER_COVER)).toBe(true);
    expect(isPlaceholderImage('/images/placeholder-scene.png')).toBe(true);
    expect(isPlaceholderImage('https://i.muistory.com/a.webp')).toBe(false);
    expect(isPlaceholderImage(undefined)).toBe(false);
  });
  it('resolveTarget 对占位封面返回无 url', async () => {
    expect((await resolveTarget(game(PLACEHOLDER_COVER), { kind: 'cover' }))?.url).toBeUndefined();
    expect((await resolveTarget(game('https://x/a.webp'), { kind: 'cover' }))?.url).toBe('https://x/a.webp');
  });
  it('missingDeclaredKeys 包含占位封面', () => {
    expect(missingDeclaredKeys(game(PLACEHOLDER_COVER)).length).toBe(1);
    expect(missingDeclaredKeys(game('https://x/a.webp')).length).toBe(0);
  });
});
