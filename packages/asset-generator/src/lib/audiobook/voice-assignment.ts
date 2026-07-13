/**
 * 有声书音色分配（CLI 侧薄封装）
 * 实际的确定性哈希/回退逻辑在 @mui-gamebook/core，这里只是把 CLI 用的 Game
 * 类型适配成 core 的通用角色名单类型，保持 manifest-generator.ts 的调用方式不变
 */
import type { Game } from '@mui-gamebook/parser';
import { resolveVoiceForSpeaker as resolveVoiceForSpeakerCore } from '@mui-gamebook/core/lib/audiobook/voice-assignment';

export function resolveVoiceForSpeaker(speakerId: string, game: Game): string {
  return resolveVoiceForSpeakerCore(speakerId, game.ai?.characters || {});
}
