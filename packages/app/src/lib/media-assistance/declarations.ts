import type { Game } from '@roudanio/parser';
import { normalizeTarget, targetKey } from './targets';
import type { MediaTarget } from './types';

export function missingDeclaredKeys(game: Game): string[] {
  const targets: MediaTarget[] = [];
  if (game.cover_prompt && !game.cover_image) targets.push({ kind: 'cover' });
  for (const [characterId, character] of Object.entries(game.ai.characters ?? {})) {
    if (character.image_prompt && !character.image_url) targets.push({ kind: 'character', characterId });
  }
  for (const scene of Object.values(game.scenes)) {
    for (const node of scene.nodes) {
      if (node.type === 'ai_image' && !node.url) targets.push({ kind: 'image', sceneId: scene.id });
      if (node.type === 'ai_video' && !node.url) targets.push({ kind: 'video', sceneId: scene.id });
      if (node.type === 'ai_audio' && !node.url) targets.push({ kind: 'audio', sceneId: scene.id });
    }
  }
  return targets.map((target) => targetKey(normalizeTarget(game, target)));
}
