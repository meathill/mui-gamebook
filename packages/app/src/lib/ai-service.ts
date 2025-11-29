import { getCloudflareContext } from '@opennextjs/cloudflare';
import { GoogleGenAI } from '@google/genai';
import { generateImage } from '@mui-gamebook/core/lib/ai';

export async function generateAndUploadImage(prompt: string, fileName: string): Promise<string> {
  const { env } = getCloudflareContext();

  // 1. Generate
  const apiKey = env.GOOGLE_API_KEY_NEW || process.env.GOOGLE_API_KEY_NEW;
  if (!apiKey) throw new Error('GOOGLE_API_KEY_NEW not configured');

  const genAI = new GoogleGenAI({
    apiKey: apiKey,
  });
  const model = env.GOOGLE_IMAGE_MODEL || process.env.GOOGLE_IMAGE_MODEL || 'gemini-3-pro-image-preview';
  const { buffer, type } = await generateImage(genAI, model, prompt);

  // 2. Upload to R2
  const bucket = env.ASSETS_BUCKET;
  if (!bucket) throw new Error('R2 Bucket \'ASSETS_BUCKET\' not found');

  await bucket.put(fileName, buffer, {
    httpMetadata: { contentType: type },
  });

  // 3. Return Public URL
  const publicDomain = env.ASSETS_PUBLIC_DOMAIN || process.env.ASSETS_PUBLIC_DOMAIN;
  return `${publicDomain}/${fileName}`;
}
