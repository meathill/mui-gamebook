import { GoogleGenAI, PartUnion, ThinkingLevel } from "@google/genai";

/**
 * AI 用量信息
 */
export interface AiUsageInfo {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * 图片生成结果
 */
export interface ImageGenerationResult {
  buffer: Buffer;
  type: string;
  usage: AiUsageInfo;
}

/**
 * 文本生成结果
 */
export interface TextGenerationResult {
  text: string;
  usage: AiUsageInfo;
}

/**
 * Generates an image with Google AI.
 */
export async function generateImage(
  genAI: GoogleGenAI,
  model: string,
  prompt: string,
): Promise<ImageGenerationResult> {
  console.log(`[AI] Generating image for prompt: "${prompt}"`);
  const response = await genAI.models.generateContent({
    model,
    contents: prompt,
  });

  // 提取用量信息
  const usage: AiUsageInfo = {
    promptTokens: response.usageMetadata?.promptTokenCount ?? 0,
    completionTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
    totalTokens: response.usageMetadata?.totalTokenCount ?? 0,
  };

  let buffer: Buffer;
  if (!response.candidates || response.candidates.length === 0) {
    throw new Error('No candidates received from Google AI.');
  }

  const [candidate] = response.candidates;
  if (!candidate.content || !candidate.content.parts) {
    throw new Error('No content parts received from Google AI.');
  }
  for (const part of candidate.content.parts) {
    if (part.text) {
      console.log(part.text);
    } else if (part.inlineData) {
      const imageData = part.inlineData.data;
      if (!imageData) {
        continue;
      }
      buffer = Buffer.from(imageData, 'base64');
      return {
        type: part.inlineData.mimeType || '',
        buffer,
        usage,
      };
    }
  }
  throw new Error('No image data received from Google AI.');
}

export async function generateText(
  genAI: GoogleGenAI,
  model: string,
  prompt: String,
  thinking?: ThinkingLevel,
): Promise<TextGenerationResult> {
  console.log(`[AI] Generating text for prompt: "${prompt}"`);
  const response = await genAI.models.generateContent({
    model,
    contents: prompt as PartUnion,
    ...thinking && {
      config: {
        thinkingConfig: {
          thinkingLevel: thinking,
        },
      }
    },
  });

  // 提取用量信息
  const usage: AiUsageInfo = {
    promptTokens: response.usageMetadata?.promptTokenCount ?? 0,
    completionTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
    totalTokens: response.usageMetadata?.totalTokenCount ?? 0,
  };

  return {
    text: response.text || '',
    usage,
  };
}
