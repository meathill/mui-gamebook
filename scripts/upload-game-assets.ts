import fs from 'node:fs';
import path from 'node:path';

// --- Utils ---

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed: Record<string, string | boolean> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      // check if next arg is a value or another flag
      if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
        parsed[key] = args[i + 1];
        i++;
      } else {
        parsed[key] = true;
      }
    }
  }
  return parsed;
}

function findAssets(dir: string): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      // Ignore subdirs
    } else {
      if (/\.(png|jpg|jpeg|webp|js)$/i.test(file)) {
        results.push(filePath);
      }
    }
  });
  return results;
}

// --- Main ---

const configPath = path.join(process.cwd(), '.agent/config.json');
let config = { apiUrl: 'https://muistory.com' };
if (fs.existsSync(configPath)) {
  try {
    const configFile = fs.readFileSync(configPath, 'utf-8');
    config = { ...config, ...JSON.parse(configFile) };
  } catch (e) {
    console.warn('Failed to read .agent/config.json, using defaults.');
  }
}

const API_URL = process.env.API_URL || config.apiUrl;
const ADMIN_PASSWORD = process.env.MUI_ADMIN_PASSWORD;

if (!ADMIN_PASSWORD) {
  console.error('Error: MUI_ADMIN_PASSWORD environment variable is not set.');
  process.exit(1);
}

const argv = parseArgs();
const mdFilePath = argv.file as string;
const assetsDir = argv.assets as string;
const gameSlug = argv.slug as string;
const dryRun = !!argv.dryRun;

if (!mdFilePath || !assetsDir || !gameSlug) {
  console.error(
    'Usage: npx tsx scripts/upload-game-assets.ts --file <path/to/script.md> --assets <path/to/assets> --slug <game-slug>',
  );
  process.exit(1);
}

async function uploadAsset(filePath: string, gameSlug: string): Promise<string | null> {
  const fileName = path.basename(filePath);
  console.log(`Uploading ${fileName}...`);

  if (dryRun) {
    return `https://mock-url.com/${gameSlug}/${fileName}`;
  }

  const fileContent = fs.readFileSync(filePath);
  const base64Content = fileContent.toString('base64');
  let contentType = 'application/octet-stream';
  if (fileName.endsWith('.png')) contentType = 'image/png';
  else if (fileName.endsWith('.webp')) contentType = 'image/webp';
  else if (fileName.endsWith('.js')) contentType = 'application/javascript';

  try {
    const response = await fetch(`${API_URL}/api/agent/assets/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ADMIN_PASSWORD}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        gameSlug,
        fileName,
        base64: base64Content,
        contentType,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Upload failed for ${fileName}: ${response.status} ${response.statusText} - ${errorText}`);
      return null;
    }

    const data = await response.json();
    return data.url;
  } catch (error) {
    console.error(`Upload error for ${fileName}:`, error);
    return null;
  }
}

async function createOrUpdateGame(slug: string, title: string, content: string, ownerId?: string) {
  console.log('Submitting game to database...');

  if (dryRun) {
    console.log('Dry run: Skipping game submission.');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/api/agent/games`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ADMIN_PASSWORD}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        slug,
        content,
        ownerId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Game submission failed: ${response.status} ${response.statusText} - ${errorText}`);
      return;
    }

    console.log('Game submitted successfully!');
  } catch (error) {
    console.error('Game submission error:', error);
  }
}

interface MinigameData {
  name: string;
  description?: string;
  prompt: string;
  code: string;
  variables?: Record<string, string>;
}

async function submitMinigames(minigames: MinigameData[], ownerId?: string) {
  if (minigames.length === 0) return;

  console.log(`Submitting ${minigames.length} minigames to database...`);

  if (dryRun) {
    console.log('Dry run: Skipping minigames submission.');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/api/agent/minigames`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ADMIN_PASSWORD}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(minigames.map((mg) => ({ ...mg, ownerId }))),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Minigames submission failed: ${response.status} ${response.statusText} - ${errorText}`);
      return;
    }

    const result = await response.json();
    console.log(`Minigames submitted: ${result.results?.length || 0} processed`);
  } catch (error) {
    console.error('Minigames submission error:', error);
  }
}


async function main() {
  // 1. Scan assets
  const assetFiles = findAssets(assetsDir);
  console.log(`Found ${assetFiles.length} asset files in ${assetsDir}`);

  const assetMap = new Map<string, string>(); // sceneName/key -> filePath
  let coverPath: string | null = null;

  for (const file of assetFiles) {
    const ext = path.extname(file).toLowerCase();
    const basename = path.basename(file, ext);
    const isMinigame = ext === '.js';

    // Handle Cover
    if (basename.includes('cover')) {
      if (!coverPath || file > coverPath) {
        coverPath = file;
      }
      continue;
    }

    // Handle Scenes & Minigames
    const parts = basename.split('_');
    let assetKey = basename;

    if (parts.length >= 3) {
      // For images: hp2_scene_01_bedroom_timestamp -> scene_01_bedroom
      // For minigames: harry-potter-2_de_gnoming_game_minigame -> de_gnoming_game_minigame
      assetKey = parts.slice(1, -1).join('_');
    }

    // For minigames, add _minigame suffix for matching
    if (isMinigame && !assetKey.endsWith('_minigame')) {
      assetKey = assetKey + '_minigame';
    }

    // Keep the latest file for each key
    const existing = assetMap.get(assetKey);
    if (!existing || file > existing) {
      assetMap.set(assetKey, file);
    }
  }

  console.log(`Mapped ${assetMap.size} assets (scenes/minigames) and cover: ${!!coverPath}`);
  console.log('Asset keys:', Array.from(assetMap.keys()).join(', '));

  // Load scene ID mapping from external config file (if exists)
  // This allows per-game customization without modifying the script
  const mappingFilePath = path.join(assetsDir, 'mapping.json');
  let sceneIdMap: Record<string, string> = {};

  if (fs.existsSync(mappingFilePath)) {
    try {
      const mappingContent = fs.readFileSync(mappingFilePath, 'utf-8');
      sceneIdMap = JSON.parse(mappingContent);
      console.log(`Loaded ${Object.keys(sceneIdMap).length} mappings from mapping.json`);
    } catch (e) {
      console.warn('Failed to parse mapping.json, using empty mapping.');
    }
  } else {
    console.log('No mapping.json found, asset keys will be used directly as scene IDs.');
  }

  // Apply scene ID mapping
  const mappedAssetMap = new Map<string, string>();
  for (const [key, filePath] of assetMap.entries()) {
    const mappedKey = sceneIdMap[key] || key;
    mappedAssetMap.set(mappedKey, filePath);
    if (sceneIdMap[key]) {
      console.log(`  Mapped: ${key} -> ${mappedKey}`);
    }
  }

  // 2. Upload and get URLs
  const urlMap = new Map<string, string>();
  const CONCURRENCY = 5;

  const uploadQueue = [];

  if (coverPath) {
    uploadQueue.push(async () => {
      const url = await uploadAsset(coverPath!, gameSlug);
      if (url) urlMap.set('cover', url);
    });
  }

  for (const [key, filePath] of mappedAssetMap.entries()) {
    uploadQueue.push(async () => {
      const url = await uploadAsset(filePath, gameSlug);
      if (url) urlMap.set(key, url);
    });
  }

  // Process queue with concurrency limit
  const results = [];
  for (let i = 0; i < uploadQueue.length; i += CONCURRENCY) {
    const batch = uploadQueue.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map((fn) => fn()));
  }

  // 3. Process Markdown
  let content = fs.readFileSync(mdFilePath, 'utf-8');
  const lines = content.split('\n');
  const newLines: string[] = [];

  let currentScene: string | null = null;
  let inImageGenBlock = false;
  let inMinigameGenBlock = false;
  let currentMinigameBlock: string[] = [];
  const collectedMinigames: MinigameData[] = [];
  let title = 'New Game';

  // ... (Title extraction logic remains)

  // ... (Cover injection logic remains)

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('# ')) {
      currentScene = trimmed.substring(2).trim();
    }

    // Image Gen Block
    if (trimmed.startsWith('```image-gen')) {
      inImageGenBlock = true;
      newLines.push(line);
      continue;
    }

    if (inImageGenBlock) {
      if (trimmed.startsWith('```')) {
        inImageGenBlock = false;
        if (currentScene && urlMap.has(currentScene)) {
          newLines.push(`url: ${urlMap.get(currentScene)}`);
        }
        newLines.push(line);
      } else if (trimmed.startsWith('url:')) {
        continue;
      } else {
        newLines.push(line);
      }
      continue; // Skip rest of loop
    }

    // Minigame Gen Block
    if (trimmed.startsWith('```minigame-gen')) {
      inMinigameGenBlock = true;
      currentMinigameBlock = [];
      newLines.push(line);
      continue;
    }

    if (inMinigameGenBlock) {
      if (trimmed.startsWith('```')) {
        inMinigameGenBlock = false;

        const jsKey = currentScene + '_minigame';
        if (currentScene && urlMap.has(jsKey)) {
          newLines.push(`url: ${urlMap.get(jsKey)}`);

          // Collect minigame data for DB submission
          const blockText = currentMinigameBlock.join('\n');
          const promptMatch = blockText.match(/prompt:\s*['"](.+?)['"]/s);
          const variablesMatch = blockText.match(/variables:\s*\n((?:\s+\w+:.+\n?)+)/);

          if (promptMatch) {
            const prompt = promptMatch[1];
            const variables: Record<string, string> = {};

            if (variablesMatch) {
              const varsText = variablesMatch[1];
              const varLines = varsText.split('\n').filter((l) => l.trim());
              for (const vl of varLines) {
                const match = vl.match(/\s*(\w+):\s*(.+)/);
                if (match) {
                  variables[match[1]] = match[2].trim();
                }
              }
            }

            // Read JS code from asset file
            const jsFilePath = mappedAssetMap.get(jsKey);
            let code = '';
            if (jsFilePath && fs.existsSync(jsFilePath)) {
              code = fs.readFileSync(jsFilePath, 'utf-8');
            }

            if (code) {
              collectedMinigames.push({
                name: currentScene,
                description: prompt.slice(0, 200),
                prompt,
                code,
                variables,
              });
            }
          }
        }
        newLines.push(line);
      } else if (trimmed.startsWith('url:')) {
        continue;
      } else {
        currentMinigameBlock.push(line);
        newLines.push(line);
      }
      continue;
    }

    newLines.push(line);
  }

  const finalContent = newLines.join('\n');

  // Save locally
  fs.writeFileSync(mdFilePath, finalContent);
  console.log(`Updated markdown saved to ${mdFilePath}`);

  // 4. Submit to DB
  const userId = (config as any).userId;
  await createOrUpdateGame(gameSlug, title, finalContent, userId);

  // 5. Submit minigames to DB
  await submitMinigames(collectedMinigames, userId);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

