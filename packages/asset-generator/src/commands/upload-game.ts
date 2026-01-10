import fs from 'node:fs';
import path from 'node:path';
import { findAssets } from '../lib/upload/asset-finder';
import { processGame } from '../lib/upload/game-processor';
import { ApiService } from '../lib/upload/api-service';

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
      console.log(`Uploading ${type}: ${path.basename(filePath)}`);
      if (dryRun) return `https://mock.url/${path.basename(filePath)}`;

      const content = fs.readFileSync(filePath);
      const mime = filePath.endsWith('.js')
        ? 'application/javascript'
        : filePath.endsWith('.png')
          ? 'image/png'
          : 'image/webp'; // simplified
      return apiService.uploadAsset(path.basename(filePath), content, mime, slug);
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
