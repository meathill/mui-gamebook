import fs from 'node:fs';
import path from 'node:path';
import { findAssets } from '../lib/upload/asset-finder';
import { processGame } from '../lib/upload/game-processor';
import { ApiService } from '../lib/upload/api-service';
import { imageToWebp } from '../lib/converter';

interface UploadOptions {
  file: string;
  assets: string;
  slug: string;
  dryRun?: boolean;
}

export async function uploadGame(options: UploadOptions) {
  const { file, assets, slug, dryRun } = options;
  console.log(`Starting upload for ${slug}...`);

  // Config
  const configPath = path.join(process.cwd(), '.agent/config.json');
  let config = { apiUrl: 'https://muistory.com' };
  if (fs.existsSync(configPath)) {
    try {
      Object.assign(config, JSON.parse(fs.readFileSync(configPath, 'utf-8')));
    } catch {}
  }

  const API_URL = process.env.API_URL || config.apiUrl;
  const ADMIN_PASSWORD = process.env.MUI_ADMIN_PASSWORD;

  if (!ADMIN_PASSWORD && !dryRun) {
    throw new Error('MUI_ADMIN_PASSWORD is required');
  }

  const apiService = new ApiService(API_URL, ADMIN_PASSWORD || '');

  // 1. Find Assets
  console.log('Scanning assets...');
  const assetMap = findAssets(assets);
  console.log(`Found ${assetMap.assets.size} assets, cover: ${!!assetMap.coverPath}`);

  // 2. Process Game
  console.log('Processing game content...');
  const result = await processGame(
    file,
    assetMap.keyMap,
    assetMap.portraits,
    assetMap.coverPath,
    async (filePath, type) => {
      let uploadPath = filePath;
      let uploadContent: Buffer;
      let mime: string;

      if (filePath.endsWith('.png')) {
        console.log(`Converting to WebP: ${path.basename(filePath)}`);
        const pngContent = fs.readFileSync(filePath);
        uploadContent = imageToWebp(pngContent);
        mime = 'image/webp';
        // Change extension for upload filename, and remove existing timestamp prefix if present
        const cleanBasename = path.basename(filePath, '.png').replace(/^\d+-/, '');
        const filename = cleanBasename + '.webp';
        uploadPath = path.join(path.dirname(filePath), filename);
      } else {
        uploadContent = fs.readFileSync(filePath);
        mime = filePath.endsWith('.js')
          ? 'application/javascript'
          : filePath.endsWith('.webp')
            ? 'image/webp'
            : 'application/octet-stream';
      }

      console.log(`Uploading ${type}: ${path.basename(uploadPath)} (${mime})`);
      if (dryRun) return `https://mock.url/${path.basename(uploadPath)}`;

      return apiService.uploadAsset(path.basename(uploadPath), uploadContent, mime, slug);
    },
  );

  // 3. Save Markdown
  if (!dryRun) {
    fs.writeFileSync(file, result.markdown);
    console.log('Updated markdown file.');
  } else {
    console.log('Dry run: Skipping file write.');
  }

  // 4. Submit Game
  console.log('Submitting game data...');
  if (!dryRun) {
    await apiService.submitGame({
      title: result.metadata.title,
      slug,
      content: result.markdown,
      description: result.metadata.description,
      backgroundStory: result.metadata.backgroundStory,
      coverImage: result.metadata.coverImage,
      tags: result.metadata.tags,
      // ownerId is extracted from token on server usually, or config
    });
  } else {
    console.log('Dry run: Skipping game submission.');
  }

  // 5. Submit Minigames
  console.log(`Submitting ${result.minigames.length} minigames...`);
  if (!dryRun) {
    await apiService.submitMinigames(result.minigames);
  } else {
    console.log('Dry run: Skipping minigame submission.');
  }

  console.log('Done!');
}
