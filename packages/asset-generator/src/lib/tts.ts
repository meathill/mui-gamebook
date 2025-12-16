/**
 * TTS 语音生成模块
 * 使用 Gemini TTS 将文本转换为语音
 */
import type { GoogleGenAI } from '@google/genai';
import { retry } from './utils';

// TTS 模型
export const GOOGLE_TTS_MODEL = 'gemini-2.5-flash-preview-tts';

// 可用的声音选项
// 适合儿童的温和声音推荐：Aoede, Kore, Puck
export type VoiceName =
  | 'Aoede' // 温和女声
  | 'Kore' // 活泼女声
  | 'Puck' // 活泼男声
  | 'Charon' // 沉稳男声
  | 'Fenrir' // 深沉男声
  | 'Leda' // 温柔女声
  | 'Orus' // 自然男声
  | 'Zephyr'; // 中性声音

export interface TTSResult {
  buffer: Buffer;
  mimeType: string;
}

/**
 * 生成语音（内部实现）
 */
async function _generateSpeech(genAI: GoogleGenAI, text: string, voiceName: VoiceName = 'Aoede'): Promise<TTSResult> {
  console.log(`[TTS] Generating speech for: "${text.substring(0, 50)}..."`);

  const response = await genAI.models.generateContent({
    model: GOOGLE_TTS_MODEL,
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName },
        },
      },
    },
  });

  const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

  if (!data) {
    throw new Error('TTS 生成失败：未返回音频数据');
  }

  return {
    buffer: Buffer.from(data, 'base64'),
    mimeType: 'audio/wav',
  };
}

/**
 * 生成语音（带重试）
 */
export async function generateSpeech(
  genAI: GoogleGenAI,
  text: string,
  voiceName: VoiceName = 'Aoede',
): Promise<TTSResult> {
  return retry(() => _generateSpeech(genAI, text, voiceName));
}

/**
 * 为儿童故事生成语音的辅助函数
 * 使用温和、有表现力的方式朗读
 */
export async function generateStorySpeech(
  genAI: GoogleGenAI,
  text: string,
  voiceName: VoiceName = 'Aoede',
): Promise<TTSResult> {
  // 添加朗读指导，让语音更适合儿童
  const enhancedText = `请用温柔、有表现力的方式朗读这段故事，语速稍慢，适合小朋友听：

${text}`;

  return generateSpeech(genAI, enhancedText, voiceName);
}
