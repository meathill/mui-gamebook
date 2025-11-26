import { GoogleGenAI } from "@google/genai";

/**
 * Generates an image with Google AI.
 */
export async function generateImage(
  genAI: GoogleGenAI,
  model: string,
  prompt: string,
): Promise<{
  buffer: Buffer,
  type: string,
}> {
  console.log(`[AI] Generating image for prompt: "${prompt}"`);
  const response = await genAI.models.generateContent({
    model,
    contents: prompt,
  });
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
      };
    }
  }
  throw new Error('No image data received from Google AI.');
}
