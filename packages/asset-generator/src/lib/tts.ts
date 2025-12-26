/**
 * TTS 语音生成模块
 * 使用 AI Provider 将文本转换为语音
 */
import { retry } from './utils';
import { getAiProvider, DEFAULT_TTS_VOICE } from './config';
import type { TTSResult as CoreTTSResult } from '@mui-gamebook/core/lib/ai-provider';

// 可用的声音选项（Google Gemini）
export type GoogleVoiceName =
  | 'Aoede' // 温和女声
  | 'Kore' // 活泼女声
  | 'Puck' // 活泼男声
  | 'Charon' // 沉稳男声
  | 'Fenrir' // 深沉男声
  | 'Leda' // 温柔女声
  | 'Orus' // 自然男声
  | 'Zephyr'; // 中性声音

// OpenAI 声音选项
export type OpenAIVoiceName =
  | 'alloy'
  | 'ash'
  | 'ballad'
  | 'coral'
  | 'echo'
  | 'fable'
  | 'nova'
  | 'onyx'
  | 'sage'
  | 'shimmer'
  | 'verse';

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
