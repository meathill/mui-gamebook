/**
 * 有声书音色分配
 * 根据说话人 ID 确定性地解析出对应的 MiMo 音色
 */
import { MIMO_VOICE_IDS, DEFAULT_MIMO_VOICE } from '../voice-config';
import { NARRATOR_SPEAKER_ID, type CharacterRoster } from './types';

/** 未显式配置音色时，角色的确定性回退音色池：仅 4 个中文预置音色，不含 mimo_default 和英文音色 */
const CHARACTER_FALLBACK_VOICE_IDS = ['冰糖', '茉莉', '苏打', '白桦'] as const;

/**
 * 简单的字符串哈希函数（与 packages/asset-generator 的 cache.ts 里那个算法一致，
 * 这里独立实现一份是为了让 core 不依赖任何 Node/fs 相关模块，保持可移植）
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).substring(0, 8);
}

function isValidMimoVoice(voice: string | undefined): voice is string {
  return !!voice && (MIMO_VOICE_IDS as readonly string[]).includes(voice);
}

/**
 * 解析某个说话人应使用的 MiMo 音色
 *
 * 优先级：roster[speakerId].voice_name 显式配置 > 确定性回退。
 * 旁白（narrator）永远不会落入角色回退池，只会用 roster.narrator?.voice_name
 * 或 mimo_default；具体角色用 speakerId 的哈希值确定性地从 4 个中文预置音色里选一个，
 * 同一个角色 ID 每次都落到同一个音色，重跑不会串音色。
 */
export function resolveVoiceForSpeaker(speakerId: string, roster: CharacterRoster): string {
  if (speakerId === NARRATOR_SPEAKER_ID) {
    const override = roster[NARRATOR_SPEAKER_ID]?.voice_name;
    return isValidMimoVoice(override) ? override : DEFAULT_MIMO_VOICE;
  }

  const explicit = roster[speakerId]?.voice_name;
  if (isValidMimoVoice(explicit)) {
    return explicit;
  }

  const index = Number.parseInt(simpleHash(speakerId), 16) % CHARACTER_FALLBACK_VOICE_IDS.length;
  return CHARACTER_FALLBACK_VOICE_IDS[index];
}
