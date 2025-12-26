/**
 * TTS 语音生成模块
 * 使用 AI Provider 将文本转换为语音
 */
import { retry } from './utils';
import { getAiProvider, DEFAULT_TTS_VOICE } from './config';
import {
  GOOGLE_VOICE_IDS,
  OPENAI_VOICE_IDS,
  DEFAULT_GOOGLE_VOICE,
  DEFAULT_OPENAI_VOICE,
} from '@mui-gamebook/core/lib/voice-config';

// 音色类型从 core 配置派生
export type GoogleVoiceName = (typeof GOOGLE_VOICE_IDS)[number];
export type OpenAIVoiceName = (typeof OPENAI_VOICE_IDS)[number];
export type VoiceName = GoogleVoiceName | OpenAIVoiceName;

export interface TTSResult {
  buffer: Buffer;
  mimeType: string;
}

/**
 * 生成语音
 */
async function _generateSpeech(text: string, voiceName: VoiceName = 'Aoede'): Promise<TTSResult> {
  console.log(`[TTS] Generating speech for: "${text.substring(0, 50)}..."`);

  const provider = getAiProvider();

  if (!provider.generateTTS) {
    throw new Error(`AI provider ${provider.type} does not support TTS`);
  }

  const result = await provider.generateTTS(text, voiceName);

  return {
    buffer: result.buffer,
    mimeType: result.mimeType,
  };
}

/**
 * 生成语音（带重试）
 */
export async function generateSpeech(
  text: string,
  voiceName: VoiceName = DEFAULT_TTS_VOICE as VoiceName,
): Promise<TTSResult> {
  return retry(() => _generateSpeech(text, voiceName));
}

/**
 * 为儿童故事生成语音的辅助函数
 * 使用温和、有表现力的方式朗读
 */
export async function generateStorySpeech(
  text: string,
  voiceName: VoiceName = DEFAULT_TTS_VOICE as VoiceName,
  style?: string,
): Promise<TTSResult> {
  // 使用自定义风格或默认风格
  const stylePrompt = style || '请用温柔、有表现力的方式朗读这段故事，语速稍慢，适合小朋友听：';

  const enhancedText = `${stylePrompt}

${text}`;

  return generateSpeech(enhancedText, voiceName);
}

// 重新导出默认音色常量供外部使用
export { DEFAULT_GOOGLE_VOICE, DEFAULT_OPENAI_VOICE };
