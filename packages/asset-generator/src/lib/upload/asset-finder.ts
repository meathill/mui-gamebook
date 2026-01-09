import fs from 'node:fs';
import path from 'node:path';

export interface AssetMap {
  assets: Map<string, string>; // key -> filePath
  keyMap: Map<string, string>; // sceneId -> filePath (mapped via mapping.json if exists)
  coverPath: string | null;
  portraits: Map<string, string>; // charName -> filePath
}

/**
 * Scans a directory for game assets (images, minigame scripts)
 * and organizes them into a structured map.
 */
export function findAssets(dir: string): AssetMap {
  const result: AssetMap = {
    assets: new Map(),
    keyMap: new Map(),
    coverPath: null,
    portraits: new Map(),
  };

  if (!fs.existsSync(dir)) {
    console.warn(`Assets directory not found: ${dir}`);
    return result;
  }

  const files = fs.readdirSync(dir);
  // Sort files to ensure deterministic selection (e.g. latest timestamp)
  // We assume files effectively have timestamps or sequence numbers if duplicates exist
  // Reverse sort might be better if we want latest?
  // The existing script iteration logic was: "if file > existing". Lexicographical comparison.
  // So 'scene_1.png' < 'scene_2.png'. 'scene_2023.png' < 'scene_2024.png'.
  // So iterating sorted list is fine.
  files.sort();

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) continue;

    const ext = path.extname(file).toLowerCase();
    if (!['.png', '.jpg', '.jpeg', '.webp', '.js'].includes(ext)) continue;

    const basename = path.basename(file, ext);
    const isMinigame = ext === '.js';

    // 1. Cover
    if (basename.includes('cover')) {
      // Simplified: Just take the last one that matches 'cover' if multiple?
      // Existing logic: keep latest by string comparison.
      result.coverPath = filePath;
      continue;
    }

    // 2. Portraits
    // Pattern: {charName}_portrait_{timestamp} or just {charName}_portrait
    if (basename.includes('_portrait')) {
      const match = basename.match(/^(.+)_portrait/);
      if (match) {
        const charName = match[1].toLowerCase();
        result.portraits.set(charName, filePath);
      }
      continue;
    }

    // 3. Scenes & Minigames
    // Pattern: {gameSlug}_{sceneId}_{timestamp} OR {sceneId}_{timestamp} OR just {sceneId}
    // Existing script logic was: split by '_', if length >= 3, take middle?
    // That was specific to one naming convention.
    // Let's make it more robust:
    // If it has timestamps (digits at end), strip them.

    let assetKey = basename;

    // Heuristic: Remove trailing timestamp/hash if it looks like one (e.g. _1767962947279)
    // 13 digits is typical for milliseconds timestamp.
    const timestampRegex = /_(\d{10,14})$/;
    if (timestampRegex.test(assetKey)) {
      assetKey = assetKey.replace(timestampRegex, '');
    }

    // Heuristic: Remove game prefix if present (e.g. bible-journey_start -> start)
    // We assume the prefix consists of words/slug usage ending with underscore
    const prefixRegex = /^[\w-]+?_/;
    if (prefixRegex.test(assetKey) && !assetKey.startsWith('scene_') && !assetKey.includes('portrait')) {
      // Only strip if it looks like a game slug prefix.
      // Be careful not to strip 'scene_' if the file is 'scene_01'.
      // But 'bible-journey_scene_01' -> 'scene_01'.
      // 'bible-journey_start_minigame' -> 'start_minigame'.

      // Let's implement a safer check: does the prefix look like a slug?
      // simple approach: split by first _.
      const parts = assetKey.split('_');
      if (parts.length > 1) {
        // check format
        assetKey = parts.slice(1).join('_');
      }
    }

    // If minigame, ensure suffix logic
    if (isMinigame) {
      // Convention: sceneId_minigame.js
      // Key should trigger minigame association.
      // If filename is `scene_start_minigame.js`, key is `scene_start_minigame`.
    }

    result.assets.set(assetKey, filePath);
  }

  // Default mapping: key -> filePath
  for (const [key, filePath] of result.assets.entries()) {
    result.keyMap.set(key, filePath);
  }

  // Load Mapping Overrides
  const mappingPath = path.join(dir, 'mapping.json');
  if (fs.existsSync(mappingPath)) {
    try {
      const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf-8'));
      for (const [key, mappedSceneId] of Object.entries(mapping)) {
        if (result.assets.has(key)) {
          result.keyMap.set(mappedSceneId as string, result.assets.get(key)!);
        }
      }
    } catch (e) {
      console.warn('Failed to load mapping.json', e);
    }
  }

  return result;
}
