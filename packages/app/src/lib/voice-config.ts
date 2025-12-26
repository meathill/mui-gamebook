/**
 * TTS 音色配置
 * 定义 Google Gemini 和 OpenAI 支持的音色列表
 */

export interface VoiceOption {
  id: string;
  name: string;
  description: string;
  gender: 'male' | 'female' | 'neutral';
}

/**
 * Google Gemini TTS 音色列表
 * 参考: https://ai.google.dev/gemini-api/docs/speech-generation
 */
export const GOOGLE_VOICES: VoiceOption[] = [
  { id: 'Aoede', name: 'Aoede', description: '温和女声', gender: 'female' },
  { id: 'Kore', name: 'Kore', description: '活泼女声', gender: 'female' },
  { id: 'Leda', name: 'Leda', description: '温柔女声', gender: 'female' },
  { id: 'Puck', name: 'Puck', description: '活泼男声', gender: 'male' },
  { id: 'Charon', name: 'Charon', description: '沉稳男声', gender: 'male' },
  { id: 'Fenrir', name: 'Fenrir', description: '深沉男声', gender: 'male' },
  { id: 'Orus', name: 'Orus', description: '自然男声', gender: 'male' },
  { id: 'Zephyr', name: 'Zephyr', description: '中性声音', gender: 'neutral' },
];

/**
 * OpenAI TTS 音色列表
 * 参考: https://platform.openai.com/docs/guides/text-to-speech
 */
export const OPENAI_VOICES: VoiceOption[] = [
  { id: 'alloy', name: 'Alloy', description: '中性声音', gender: 'neutral' },
  { id: 'ash', name: 'Ash', description: '中性声音', gender: 'neutral' },
  { id: 'ballad', name: 'Ballad', description: '中性声音', gender: 'neutral' },
  { id: 'coral', name: 'Coral', description: '女性声音', gender: 'female' },
  { id: 'echo', name: 'Echo', description: '男性声音', gender: 'male' },
  { id: 'fable', name: 'Fable', description: '中性声音', gender: 'neutral' },
  { id: 'nova', name: 'Nova', description: '女性声音', gender: 'female' },
  { id: 'onyx', name: 'Onyx', description: '男性声音', gender: 'male' },
  { id: 'sage', name: 'Sage', description: '中性声音', gender: 'neutral' },
  { id: 'shimmer', name: 'Shimmer', description: '女性声音', gender: 'female' },
  { id: 'verse', name: 'Verse', description: '中性声音', gender: 'neutral' },
];

/**
 * 获取所有可用的音色列表
 * 目前只返回 Google 音色，因为主要使用 Google TTS
 */
export function getAvailableVoices(): VoiceOption[] {
  return GOOGLE_VOICES;
}

/**
 * 根据音色 ID 获取音色信息
 */
export function getVoiceById(id: string): VoiceOption | undefined {
  return [...GOOGLE_VOICES, ...OPENAI_VOICES].find((v) => v.id === id);
}

/**
 * 默认音色
 */
export const DEFAULT_VOICE = 'Aoede';
