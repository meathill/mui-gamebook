/**
 * TTS 音色配置
 * 从 core 仓库导入，保持唯一数据源
 */

// 从 core 仓库导入所有配置
export {
  type VoiceOption,
  type TtsProviderType,
  GOOGLE_VOICES,
  OPENAI_VOICES,
  MIMO_VOICES,
  GOOGLE_VOICE_IDS,
  OPENAI_VOICE_IDS,
  MIMO_VOICE_IDS,
  getAvailableVoices,
  getAvailableVoiceIds,
  isValidVoiceId,
  getVoiceById,
  DEFAULT_GOOGLE_VOICE,
  DEFAULT_OPENAI_VOICE,
  DEFAULT_MIMO_VOICE,
  getDefaultVoice,
} from '@mui-gamebook/core/lib/voice-config';
