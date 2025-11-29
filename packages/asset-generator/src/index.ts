import 'dotenv/config';
import { readFile, writeFile } from 'node:fs/promises';
import * as path from 'path';
import { generateImage as _generateImage } from '@mui-gamebook/core/lib/ai';
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
 * Helper function to retry an async operation with exponential backoff.
 */
async function retry<T>(
  operation: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (retries <= 0) throw error;
    console.warn(`Operation failed, retrying in ${delay}ms... (${retries} retries left)`);
    await new Promise(resolve => setTimeout(resolve, delay));
    return retry(operation, retries - 1, delay * 2);
  }
}

async function generateImage(prompt: string): Promise<{
  buffer: Buffer,
  type: string,
}> {
  return retry<{
    buffer: Buffer,
    type: string,
  }>(() => _generateImage(
    genAI,
    process.env.GOOGLE_IMAGE_MODEL!,
    prompt,
  ));
}

/**
 * Uploads a buffer to Cloudflare R2.
 */
async function uploadToR2(
  fileName: string,
  body: Buffer,
  type: string = 'image/png',

): Promise<string> {
  return retry(() => _uploadToR2(fileName, body, type));
}
async function _uploadToR2(
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

async function processGlobalAssets(game: Game, force: boolean): Promise<boolean> {
  let changed = false;

  // 1. Characters
  if (game.ai && game.ai.characters) {
    for (const [id, char] of Object.entries(game.ai.characters)) {
      if (char.image_prompt && (!char.image_url || force)) {
        const fullPrompt = `${game.ai.style?.image || ''}, character portrait of ${char.image_prompt}`;
        try {
          const { buffer, type } = await generateImage(fullPrompt);
          const fileName = `images/${game.title}/characters/${id}-${Date.now()}.png`;
          const publicUrl = await uploadToR2(fileName, buffer, type);
          char.image_url = publicUrl;
          console.log(`[SUCCESS] Generated character image for ${char.name}: ${publicUrl}`);
          changed = true;
        } catch (e: any) {
          console.error(`[ERROR] Failed to generate character image for ${char.name}: ${e.message}`);
        }
      }
    }
  }

  // 2. Cover Image
  if (game.cover_image && game.cover_image.startsWith('prompt:')) {
    const prompt = game.cover_image.replace(/^prompt:\s*/, '');
    const fullPrompt = `${game.ai.style?.image || ''}, cover art, ${prompt}`;
    try {
      const { buffer, type } = await generateImage(fullPrompt);
      const fileName = `images/${game.title}/cover-${Date.now()}.png`;
      const publicUrl = await uploadToR2(fileName, buffer, type);
      game.cover_image = publicUrl;
      console.log(`[SUCCESS] Generated cover image: ${publicUrl}`);
      changed = true;
    } catch (e: any) {
      console.error(`[ERROR] Failed to generate cover image: ${e.message}`);
    }
  }

  return changed;
}

async function processNode(node: SceneNode, game: Game, force: boolean = false): Promise<boolean> {
  if (node.type === 'ai_image' && (!node.url || force)) {
    let fullPrompt = `${game.ai.style?.image || ''}`;

        // Include character description if available
        if (node.character && game.ai.characters && game.ai.characters[node.character]) {
          const char = game.ai.characters[node.character];
          if (char.image_prompt) {
            fullPrompt += `, ${char.image_prompt}`;
          }
        }

        // Include multiple characters descriptions
        if (node.characters && node.characters.length > 0 && game.ai.characters) {
          node.characters.forEach(charId => {
            const char = game.ai?.characters?.[charId];
            if (char && char.image_prompt) {
              fullPrompt += `, ${char.image_prompt}`;
            }
          });
        }

        fullPrompt += `, ${node.prompt}`;
    try {
      const { buffer: imageBuffer, type } = await generateImage(fullPrompt);
      const folder = slugify(game.title, {
        lower: true,
        trim: true,
      });
      const fileName = `images/${folder || game.title}/${Date.now()}.png`;
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

  const fileContent = await readFile(filePath, 'utf-8');
  const parseResult = parse(fileContent);

  if (!parseResult.success) {
    console.error('Failed to parse game file:', parseResult.error);
    process.exit(1);
  }

  const game = parseResult.data;
  let hasChanged = false;

  // Process Global Assets first
  const globalChanged = await processGlobalAssets(game, force);
  if (globalChanged) hasChanged = true;

  for (const scene of game.scenes.values()) {
    for (const node of scene.nodes) {
      const updated = await processNode(node, game, force);
      if (updated) {
        hasChanged = true;
      }
    }
  }

  if (hasChanged) {
    console.log('Asset URLs have been updated. Writing back to file...');
    const newFileContent = stringify(game);
    await writeFile(filePath, newFileContent, 'utf-8');
    console.log('File updated successfully!');
  } else {
    console.log('No new assets needed to be generated. File is up to date.');
  }
}

main().catch(error => {
  console.error('An unexpected error occurred:', error);
  process.exit(1);
});
