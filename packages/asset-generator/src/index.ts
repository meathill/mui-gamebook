import 'dotenv/config';
import {readFileSync, writeFileSync} from 'fs';
import * as path from 'path';
import {Game, parse, SceneNode, stringify} from '@mui-gamebook/parser';
import {GoogleGenAI} from '@google/genai';
import {PutObjectCommand, S3Client} from '@aws-sdk/client-s3';
import slugify from "slugify";

// --- Real Implementations ---

const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const genAI = new GoogleGenAI({
  apiKey: process.env.GOOGLE_API_KEY!
});

/**
 * Generates an image with Google AI.
 * @param prompt The prompt to generate the image.
 * @returns A promise that resolves to an image buffer.
 */
async function generateImage(prompt: string): Promise<{
  buffer: Buffer,
  type: string,
}> {
  console.log(`[AI] Generating image for prompt: "${prompt}"`);

  const model = process.env.GOOGLE_IMAGE_MODEL || 'gemini-3-pro-image-preview';

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

/**
 * Uploads a buffer to Cloudflare R2.
 * @param fileName The name for the file in the bucket.
 * @param body The file content as a Buffer.
 * @returns A promise that resolves to the public URL.
 */
async function uploadToR2(
  fileName: string,
  body: Buffer,
  type: string = 'image/png',
): Promise<string> {
  console.log(`[R2] Uploading ${fileName}...`);
  await s3Client.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET!,
      Key: fileName,
      Body: body,
      ContentType: type,
    })
  );
  return `${process.env.R2_PUBLIC_URL!}/${fileName}`;
}


// --- Core Logic ---

async function processNode(node: SceneNode, game: Game, force: boolean = false): Promise<boolean> {
  if (node.type === 'ai_image' && (!node.url || force)) {
    const fullPrompt = `${game.ai.style?.image || ''}, ${node.prompt}`;
    try {
      const { buffer: imageBuffer, type } = await generateImage(fullPrompt);
      const folder = slugify(game.title, {
        lower: true,
        trim: true,
        strict: true,
      });
      const fileName = `images/${folder}/${Date.now()}.png`;
      const publicUrl = await uploadToR2(fileName, imageBuffer, type);
      node.url = publicUrl;
      console.log(`[SUCCESS] Generated and uploaded image: ${publicUrl}`);
      return true;
    } catch (error: any) {
      console.error(`[ERROR] Failed to process node for prompt "${node.prompt}": ${error.message}`);
      return false;
    }
  }
  // TODO: Add logic for 'ai_audio' and 'ai_video' here in the future
  return false;
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  // Filter out flags to find the file path argument
  const fileArgs = args.filter(arg => !arg.startsWith('--'));
  const relativePath = fileArgs[0];

  if (!relativePath) {
    console.error('Error: Please provide a path to the game file.');
    console.log('Usage: pnpm --filter=@mui-gamebook/asset-generator generate <path/to/your/game.md> [--force]');
    process.exit(1);
  }

  const filePath = path.resolve(process.cwd(), '../..', relativePath);
  console.log(`Processing file: ${filePath} (Force mode: ${force})`);

  const fileContent = readFileSync(filePath, 'utf-8');
  const parseResult = parse(fileContent);

  if (!parseResult.success) {
    console.error('Failed to parse game file:', parseResult.error);
    process.exit(1);
  }

  const game = parseResult.data;
  let hasChanged = false;

  for (const scene of game.scenes.values()) {
    for (const node of scene.nodes) {
      const updated = await processNode(node, game.title, force);
      if (updated) {
        hasChanged = true;
      }
    }
  }

  if (hasChanged) {
    console.log('Asset URLs have been updated. Writing back to file...');
    const newFileContent = stringify(game);
    writeFileSync(filePath, newFileContent, 'utf-8');
    console.log('File updated successfully!');
  } else {
    console.log('No new assets needed to be generated. File is up to date.');
  }
}

main().catch(error => {
  console.error('An unexpected error occurred:', error);
  process.exit(1);
});
