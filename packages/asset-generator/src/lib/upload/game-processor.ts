import type { AssetMap } from './asset-finder';
import type { Game } from '@mui-gamebook/parser';
import { parse, stringify } from '@mui-gamebook/parser';
import fs from 'node:fs';
import path from 'node:path';

export interface ProcessedGame {
  markdown: string;
  metadata: {
    title: string;
    description?: string;
    backgroundStory?: string;
    coverImage?: string;
    tags?: string[];
  };
  minigames: MinigameData[];
}

export interface MinigameData {
  name: string;
  description?: string;
  prompt: string;
  code: string;
  variables?: Record<string, string>;
}

export interface UploadCallback {
  (filePath: string, type: 'image' | 'minigame'): Promise<string | null>;
}

/**
 * Processes the game content:
 * 1. Parses Markdown
 * 2. Uploads linked assets (images, minigames)
 * 3. Updates URLs in the content
 * 4. Extracts minigame data
 * 5. Returns updated Markdown and metadata
 */
export async function processGame(
  markdownPath: string,
  keyMap: Map<string, string>, // sceneId/AssetKey -> FilePath
  portraits: Map<string, string>, // charName -> FilePath
  coverPath: string | null,
  uploadFn: UploadCallback,
): Promise<ProcessedGame> {
  const source = fs.readFileSync(markdownPath, 'utf-8');
  const parseResult = parse(source);

  if (!parseResult.success) {
    throw new Error(`Failed to parse game script: ${parseResult.error}`);
  }

  const game = parseResult.data as Game;
  const minigames: MinigameData[] = [];
  const uploads = new Map<string, string>(); // filePath -> uploadedUrl

  // Helper to handle upload caching with retry
  const d_upload = async (filePath: string, type: 'image' | 'minigame', retries = 3): Promise<string | null> => {
    if (uploads.has(filePath)) return uploads.get(filePath)!;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const url = await uploadFn(filePath, type);
        if (url) {
          uploads.set(filePath, url);
          return url;
        }
        return null;
      } catch (err) {
        if (attempt === retries) {
          console.error(`Failed to upload ${filePath} after ${retries} attempts:`, err);
          return null;
        }
        console.warn(`Retry ${attempt}/${retries} for ${filePath}...`);
        await new Promise((r) => setTimeout(r, 1000 * attempt)); // Exponential backoff
      }
    }
    return null;
  };

  // 1. Process Metadata (Cover & Portraits)
  // 1. Process Metadata (Cover & Portraits)
  // Skip if already has a remote URL, UNLESS it's a PNG we want to upgrade to WebP
  const currentCover = game.cover_image;
  const isCoverRemote = currentCover && currentCover.startsWith('http');
  const isCoverPng = currentCover && currentCover.endsWith('.png');

  if (coverPath && (!currentCover || !isCoverRemote || isCoverPng)) {
    const url = await d_upload(coverPath, 'image');
    if (url) game.cover_image = url;
  }

  if (game.ai.characters) {
    for (const [charId, charDef] of Object.entries(game.ai.characters)) {
      // Find matching portrait
      // Logic: exact match or prefix match?
      // existing script used startsWith or includes. Let's try exact match first manually?
      // Or iterate portraits keys.

      let matchedPath: string | undefined;

      // Priority 1: Use existing local path if available
      const currentUrl = charDef.image_url;
      if (currentUrl && !currentUrl.startsWith('http')) {
        matchedPath = currentUrl;
        if (matchedPath && !path.isAbsolute(matchedPath)) {
          const baseDir = path.dirname(markdownPath);
          matchedPath = path.resolve(baseDir, matchedPath);
        }
        if (!fs.existsSync(matchedPath)) {
          matchedPath = undefined;
        }
      }

      // Priority 2: Try to find by key pattern if no local path or file doesn't exist
      if (!matchedPath) {
        // Try exact charId match
        if (portraits.has(charId)) {
          matchedPath = portraits.get(charId);
        } else {
          // Try loose matching
          for (const [pKey, pPath] of portraits.entries()) {
            if (pKey.includes(charId) || charId.includes(pKey)) {
              matchedPath = pPath;
              break;
            }
          }
        }
      }

      if (matchedPath) {
        // Skip if already has remote URL, UNLESS it's a PNG we want to upgrade to WebP
        const currentUrl = charDef.image_url;
        const isRemote = currentUrl && currentUrl.startsWith('http');
        const isPng = currentUrl && currentUrl.endsWith('.png');

        if (!currentUrl || !isRemote || isPng) {
          const url = await d_upload(matchedPath, 'image');
          if (url) charDef.image_url = url;
        }
      }
    }
  }

  // 2. Process Scenes
  for (const scene of Object.values(game.scenes)) {
    for (const node of scene.nodes) {
      // AI Image - skip if already has remote URL, UNLESS it's a PNG we want to upgrade to WebP
      const isRemote = node.url && node.url.startsWith('http');
      const isPng = node.url && node.url.endsWith('.png');

      if (node.type === 'ai_image' && (!isRemote || isPng)) {
        // Priority 1: Use existing local path if available
        let assetPath = node.url;
        if (assetPath && !path.isAbsolute(assetPath)) {
          // Resolve relative to markdown file location
          const baseDir = path.dirname(markdownPath);
          assetPath = path.resolve(baseDir, assetPath);
        }

        // Priority 2: Try to find by key pattern if no local path or file doesn't exist
        if (!assetPath || !fs.existsSync(assetPath)) {
          assetPath = keyMap.get(`scene_${scene.id}`) || keyMap.get(scene.id);
        }

        // Priority 3: Reverse lookup from remote URL filename (handling timestamp prefixes)
        if ((!assetPath || !fs.existsSync(assetPath)) && isRemote && typeof node.url === 'string') {
          const remoteBasename = path.basename(node.url);
          // Try exact match in assets dir (assuming assets dir is 'assets' relative to md)
          const baseDir = path.dirname(markdownPath);
          const assetsDir = path.join(baseDir, 'assets');

          let candidate = path.join(assetsDir, remoteBasename);
          if (fs.existsSync(candidate)) {
            assetPath = candidate;
          } else {
            // Try stripping timestamp prefix (e.g. 1768...-name.png)
            const cleanName = remoteBasename.replace(/^\d+-/, '');
            candidate = path.join(assetsDir, cleanName);
            if (fs.existsSync(candidate)) {
              assetPath = candidate;
            }
          }
        }

        if (assetPath) {
          const url = await d_upload(assetPath, 'image');
          if (url) node.url = url;
        }
      }

      // Minigame - skip upload if already has remote URL, but still collect for submission
      if (node.type === 'minigame') {
        const minigameKey = `${scene.id}_minigame`;
        const assetPath = keyMap.get(minigameKey);

        if (assetPath) {
          // Only upload if no remote URL yet
          if (!node.url || !node.url.startsWith('http')) {
            const url = await d_upload(assetPath, 'minigame');
            if (url) node.url = url;
          }

          // Always collect minigame data for submission
          const code = fs.readFileSync(assetPath, 'utf-8');
          minigames.push({
            name: scene.id,
            description: node.prompt.slice(0, 200),
            prompt: node.prompt,
            code,
            variables: node.variables,
          });
        }
      }
    }
  }

  // 3. Stringify
  const updatedMarkdown = stringify(game);

  return {
    markdown: updatedMarkdown,
    metadata: {
      title: game.title,
      description: game.description,
      backgroundStory: game.backgroundStory,
      coverImage: game.cover_image,
      tags: game.tags,
    },
    minigames,
  };
}
