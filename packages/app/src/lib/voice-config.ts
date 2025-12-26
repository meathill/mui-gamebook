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
  // --- Female Voices (女声) ---
  { id: 'Aoede', name: 'Aoede', description: '轻快女声 (Breezy)', gender: 'female' },
  { id: 'Kore', name: 'Kore', description: '稳重女声 (Firm)', gender: 'female' },
  { id: 'Leda', name: 'Leda', description: '年轻女声 (Youthful)', gender: 'female' },
  { id: 'Callirrhoe', name: 'Callirrhoe', description: '随和女声 (Easy-going)', gender: 'female' },
  { id: 'Autonoe', name: 'Autonoe', description: '明快女声 (Bright)', gender: 'female' },
  { id: 'Despina', name: 'Despina', description: '圆润女声 (Smooth)', gender: 'female' },
  { id: 'Erinome', name: 'Erinome', description: '清晰女声 (Clear)', gender: 'female' },
  { id: 'Laomedeia', name: 'Laomedeia', description: '欢快女声 (Upbeat)', gender: 'female' },
  { id: 'Pulcherrima', name: 'Pulcherrima', description: '自信女声 (Forward)', gender: 'female' },
  { id: 'Achird', name: 'Achird', description: '友好女声 (Friendly)', gender: 'female' },
  { id: 'Vindemiatrix', name: 'Vindemiatrix', description: '温柔女声 (Gentle)', gender: 'female' },
  { id: 'Sadachbia', name: 'Sadachbia', description: '生动女声 (Lively)', gender: 'female' },
  { id: 'Sadaltager', name: 'Sadaltager', description: '博学女声 (Knowledgeable)', gender: 'female' },
  { id: 'Sulafat', name: 'Sulafat', description: '温暖女声 (Warm)', gender: 'female' },

  // --- Male Voices (男声) ---
  { id: 'Zephyr', name: 'Zephyr', description: '明快男声 (Bright)', gender: 'male' },
  { id: 'Puck', name: 'Puck', description: '活泼男声 (Upbeat)', gender: 'male' },
  { id: 'Charon', name: 'Charon', description: '知性男声 (Informative)', gender: 'male' },
  { id: 'Fenrir', name: 'Fenrir', description: '激昂男声 (Excitable)', gender: 'male' },
  { id: 'Orus', name: 'Orus', description: '稳重男声 (Firm)', gender: 'male' },
  { id: 'Enceladus', name: 'Enceladus', description: '柔和男声 (Breathy)', gender: 'male' },
  { id: 'Iapetus', name: 'Iapetus', description: '清晰男声 (Clear)', gender: 'male' },
  { id: 'Umbriel', name: 'Umbriel', description: '随和男声 (Easy-going)', gender: 'male' },
  { id: 'Algieba', name: 'Algieba', description: '圆润男声 (Smooth)', gender: 'male' },
  { id: 'Algenib', name: 'Algenib', description: '磁性男声 (Gravelly)', gender: 'male' },
  { id: 'Rasalgethi', name: 'Rasalgethi', description: '知性男声 (Informative)', gender: 'male' },
  { id: 'Achernar', name: 'Achernar', description: '轻柔男声 (Soft)', gender: 'male' },
  { id: 'Alnilam', name: 'Alnilam', description: '坚定男声 (Firm)', gender: 'male' },
  { id: 'Schedar', name: 'Schedar', description: '平稳男声 (Even)', gender: 'male' },
  { id: 'Gacrux', name: 'Gacrux', description: '成熟男声 (Mature)', gender: 'male' },
  { id: 'Zubenelgenubi', name: 'Zubenelgenubi', description: '休闲男声 (Casual)', gender: 'male' },
];

/**
 * OpenAI TTS 音色列表
 * 参考: https://platform.openai.com/docs/guides/text-to-speech
 */
export const OPENAI_VOICES: VoiceOption[] = [
  { id: 'marin', name: 'Marin', description: '（推荐）全能男声', gender: 'male' },
  { id: 'cedar', name: 'Cedar', description: '（推荐）全能女声', gender: 'female' },
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
 * 根据 AI 提供者类型获取可用的音色列表
 */
export function getAvailableVoices(provider: 'google' | 'openai' = 'google'): VoiceOption[] {
  return provider === 'openai' ? OPENAI_VOICES : GOOGLE_VOICES;
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
