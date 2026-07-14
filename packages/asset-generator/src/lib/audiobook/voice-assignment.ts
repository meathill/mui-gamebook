/**
 * 有声书音色分配
 * 根据说话人 ID 确定性地解析出对应的 MiMo 音色
 */
import type { Game } from '@mui-gamebook/parser';
import { MIMO_VOICE_IDS, DEFAULT_MIMO_VOICE } from '@mui-gamebook/core/lib/voice-config';
import { simpleHash } from '../cache';
import { NARRATOR_SPEAKER_ID } from './types';

/** 未显式配置音色时，角色的确定性回退音色池：仅 4 个中文预置音色，不含 mimo_default 和英文音色 */
const CHARACTER_FALLBACK_VOICE_IDS = ['冰糖', '茉莉', '苏打', '白桦'] as const;

function isValidMimoVoice(voice: string | undefined): voice is string {
  return !!voice && (MIMO_VOICE_IDS as readonly string[]).includes(voice);
}

/**
 * 解析某个说话人应使用的 MiMo 音色
 *
 * 优先级：game.ai.characters[speakerId].voice_name 显式配置 > 确定性回退。
 * 旁白（narrator）永远不会落入角色回退池，只会用 game.ai.characters.narrator?.voice_name
 * 或 mimo_default；具体角色用 speakerId 的哈希值确定性地从 4 个中文预置音色里选一个，
 * 同一个角色 ID 每次都落到同一个音色，重跑不会串音色。
 */
export function resolveVoiceForSpeaker(speakerId: string, game: Game): string {
  const characters = game.ai?.characters;

  if (speakerId === NARRATOR_SPEAKER_ID) {
    const override = characters?.[NARRATOR_SPEAKER_ID]?.voice_name;
    return isValidMimoVoice(override) ? override : DEFAULT_MIMO_VOICE;
  }

  const explicit = characters?.[speakerId]?.voice_name;
  if (isValidMimoVoice(explicit)) {
    return explicit;
  }

  const index = Number.parseInt(simpleHash(speakerId), 16) % CHARACTER_FALLBACK_VOICE_IDS.length;
  return CHARACTER_FALLBACK_VOICE_IDS[index];
}
