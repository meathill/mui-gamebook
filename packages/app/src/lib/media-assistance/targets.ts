import type { Game, Scene, SceneNode } from '@roudanio/parser';
import { canonicalJson, sha256 } from './hash';
import { AssistanceError, type GenerationInput, type JsonValue, type MediaTarget } from './types';

const SCENE_ID_KEY = 'media_assistance_id';

export function hasDeclaredMedia(game: Game): boolean {
  return Boolean(
    game.cover_prompt?.trim() ||
      Object.values(game.ai.characters ?? {}).some((character) => character.image_prompt?.trim()) ||
      Object.values(game.scenes).some((scene) =>
        scene.nodes.some((node) => ['ai_image', 'ai_audio', 'ai_video'].includes(node.type)),
      ),
  );
}

export function readTarget(value: unknown): MediaTarget {
  if (!value || typeof value !== 'object') throw new AssistanceError('缺少素材位置', 400);
  const target = value as Record<string, unknown>;
  if (target.kind === 'cover') return { kind: 'cover' };
  if (target.kind === 'character' && typeof target.characterId === 'string') {
    return { kind: 'character', characterId: target.characterId };
  }
  if (typeof target.sceneId !== 'string' || !['image', 'video', 'audio', 'speech'].includes(String(target.kind))) {
    throw new AssistanceError('素材位置无效', 400);
  }
  const scene = {
    sceneId: target.sceneId,
    ...(typeof target.sceneKey === 'string' ? { sceneKey: target.sceneKey } : {}),
  };
  if (target.kind === 'speech') {
    if (
      typeof target.textHash !== 'string' ||
      !/^[a-f0-9]{64}$/.test(target.textHash) ||
      !Number.isInteger(target.occurrence) ||
      Number(target.occurrence) < 0
    ) {
      throw new AssistanceError('朗读位置需要 textHash 和非负 occurrence', 400);
    }
    return { kind: 'speech', ...scene, textHash: target.textHash, occurrence: Number(target.occurrence) };
  }
  return { kind: target.kind as 'image' | 'video' | 'audio', ...scene };
}

function findScene(game: Game, target: Extract<MediaTarget, { sceneId: string }>): Scene | undefined {
  return target.sceneKey
    ? Object.values(game.scenes).find((scene) => scene.extra?.[SCENE_ID_KEY] === target.sceneKey)
    : game.scenes[target.sceneId];
}

export async function hashSpeechNode(node: SceneNode): Promise<string> {
  if (node.type !== 'text' && node.type !== 'dialogue') throw new AssistanceError('不是朗读节点', 400);
  return sha256(
    canonicalJson({
      type: node.type,
      content: node.content,
      speaker: node.type === 'dialogue' ? node.speaker : '',
      emotion: node.type === 'dialogue' ? (node.emotion ?? '') : '',
    }),
  );
}

export function targetKey(target: MediaTarget): string {
  if (target.kind === 'cover') return 'cover';
  if (target.kind === 'character') return `character:${target.characterId}`;
  const scene = target.sceneKey ?? target.sceneId;
  return target.kind === 'speech'
    ? `scene:${scene}:speech:${target.textHash}:${target.occurrence}`
    : `scene:${scene}:${target.kind}`;
}

export function normalizeTarget(game: Game, target: MediaTarget): MediaTarget {
  if (!('sceneId' in target)) return target;
  const scene = findScene(game, target);
  const key = scene?.extra?.[SCENE_ID_KEY];
  return typeof key === 'string' ? { ...target, sceneId: scene?.id ?? target.sceneId, sceneKey: key } : target;
}

export interface ResolvedTarget {
  target: MediaTarget;
  url: string | undefined;
  sourceHash: string;
  setUrl: (url: string) => void;
}

export async function resolveTarget(game: Game, target: MediaTarget): Promise<ResolvedTarget | null> {
  let url: string | undefined;
  let source: Record<string, JsonValue>;
  let setUrl: (url: string) => void;
  let normalized = target;
  if (target.kind === 'cover') {
    url = game.cover_image;
    source = {
      prompt: game.cover_prompt ?? '',
      aspectRatio: game.cover_aspect_ratio ?? '',
      style: game.ai.style?.image ?? '',
    };
    setUrl = (value) => {
      game.cover_image = value;
    };
  } else if (target.kind === 'character') {
    const character = game.ai.characters?.[target.characterId];
    if (!character) return null;
    url = character.image_url;
    source = {
      prompt: character.image_prompt ?? '',
      description: character.description ?? '',
      style: game.ai.style?.image ?? '',
    };
    setUrl = (value) => {
      character.image_url = value;
    };
  } else {
    const scene = findScene(game, target);
    if (!scene) return null;
    normalized = {
      ...target,
      sceneId: scene.id,
      ...(typeof scene.extra?.[SCENE_ID_KEY] === 'string' ? { sceneKey: scene.extra[SCENE_ID_KEY] as string } : {}),
    };
    if (target.kind === 'speech') {
      const matches: SceneNode[] = [];
      for (const node of scene.nodes) {
        if ((node.type === 'text' || node.type === 'dialogue') && (await hashSpeechNode(node)) === target.textHash)
          matches.push(node);
      }
      const node = matches[target.occurrence];
      if (!node || (node.type !== 'text' && node.type !== 'dialogue')) return null;
      url = node.audio_url;
      source = {
        textHash: target.textHash,
        style: game.ai.style?.tts ?? '',
        voice: node.type === 'dialogue' ? (game.ai.characters?.[node.speaker]?.voice_name ?? '') : '',
      };
      setUrl = (value) => {
        node.audio_url = value;
      };
    } else {
      const type = `ai_${target.kind}`;
      const matches = scene.nodes.filter((node) => node.type === type);
      if (matches.length > 1) throw new AssistanceError('同类素材位置不唯一，需要作者先整理剧本');
      const node = matches[0];
      if (!node || !('prompt' in node) || node.type === 'minigame') return null;
      url = node.url;
      const { url: _url, extra: _extra, ...definition } = node;
      source = {
        definition: JSON.parse(JSON.stringify(definition)) as JsonValue,
        style: game.ai.style?.[target.kind] ?? '',
      };
      if (node.type === 'ai_image') {
        const ids = [...(node.characters ?? []), ...(node.character ? [node.character] : [])];
        source.characters = ids.map((id) => ({ id, ...game.ai.characters?.[id] })) as JsonValue;
      }
      setUrl = (value) => {
        node.url = value;
      };
    }
  }
  return { target: normalized, url, sourceHash: await sha256(canonicalJson(source)), setUrl };
}

export async function prepareTarget(game: Game, target: MediaTarget, input: GenerationInput): Promise<ResolvedTarget> {
  const expectedKind = target.kind === 'cover' || target.kind === 'character' ? 'image' : target.kind;
  if (expectedKind === 'audio' ? !['music', 'sfx'].includes(input.kind) : expectedKind !== input.kind) {
    throw new AssistanceError('生成类型与素材位置不匹配', 400);
  }
  if (target.kind === 'cover') {
    game.cover_prompt ||= input.prompt;
  } else if (target.kind === 'character') {
    const character = game.ai.characters?.[target.characterId];
    if (!character) throw new AssistanceError('角色不存在', 400);
    character.image_prompt ||= input.prompt;
  } else {
    const scene = findScene(game, target);
    if (!scene) throw new AssistanceError('场景不存在或已删除');
    scene.extra ??= {};
    scene.extra[SCENE_ID_KEY] ||= crypto.randomUUID();
    target = { ...target, sceneId: scene.id, sceneKey: String(scene.extra[SCENE_ID_KEY]) };
    if (target.kind !== 'speech' && !scene.nodes.some((node) => node.type === `ai_${target.kind}`)) {
      if (target.kind === 'audio')
        scene.nodes.unshift({
          type: 'ai_audio',
          audioType: input.kind === 'music' ? 'background_music' : 'sfx',
          prompt: input.prompt,
        });
      if (target.kind === 'image') scene.nodes.unshift({ type: 'ai_image', prompt: input.prompt });
      if (target.kind === 'video') scene.nodes.unshift({ type: 'ai_video', prompt: input.prompt });
    }
  }
  const resolved = await resolveTarget(game, target);
  if (!resolved) throw new AssistanceError('素材目标已变化，请重新规划');
  return resolved;
}

export async function speechTargets(game: Game): Promise<MediaTarget[]> {
  const targets: MediaTarget[] = [];
  for (const scene of Object.values(game.scenes)) {
    const counts = new Map<string, number>();
    for (const node of scene.nodes) {
      if (node.type !== 'text' && node.type !== 'dialogue') continue;
      const textHash = await hashSpeechNode(node);
      const occurrence = counts.get(textHash) ?? 0;
      counts.set(textHash, occurrence + 1);
      targets.push({
        kind: 'speech',
        sceneId: scene.id,
        textHash,
        occurrence,
        ...(typeof scene.extra?.[SCENE_ID_KEY] === 'string' ? { sceneKey: scene.extra[SCENE_ID_KEY] as string } : {}),
      });
    }
  }
  return targets;
}
