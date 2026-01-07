
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

function findImages(dir: string): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      // Recursive? Given the workflow, assets might be flat, but let's assume flat for now to match python logic
      // or just ignore subdirs if we only expect images in the root of assets dir provided
    } else {
      if (file.toLowerCase().endsWith('.png') || file.toLowerCase().endsWith('.webp')) {
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
  console.error('Usage: npx tsx scripts/upload-game-assets.ts --file <path/to/script.md> --assets <path/to/assets> --slug <game-slug>');
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
  const contentType = fileName.endsWith('.png') ? 'image/png' : 'image/webp';

  try {
    const response = await fetch(`${API_URL}/api/agent/assets/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ADMIN_PASSWORD}`,
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
        'Authorization': `Bearer ${ADMIN_PASSWORD}`,
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

async function main() {
  // 1. Scan assets
  const imageFiles = findImages(assetsDir);
  console.log(`Found ${imageFiles.length} image files in ${assetsDir}`);

  const assetMap = new Map<string, string>(); // sceneName -> filePath
  let coverPath: string | null = null;

  for (const file of imageFiles) {
    const basename = path.basename(file, '.png');

    // Handle Cover
    if (basename.includes('cover')) {
      if (!coverPath || file > coverPath) {
        coverPath = file;
      }
      continue;
    }

    // Handle Scenes
    // Logic: hp1_sceneName_timestamp -> sceneName
    const parts = basename.split('_');
    let sceneName = basename;

    // Example: hp1_cupboard_exit_1767687283711
    // prefix=hp1, suffix=timestamp
    if (parts.length >= 3) {
      sceneName = parts.slice(1, -1).join('_');
    }

    // Keep the latest file for each scene (lexicographical sort works for timestamp suffix)
    const existing = assetMap.get(sceneName);
    if (!existing || file > existing) {
      assetMap.set(sceneName, file);
    }
  }

  console.log(`Mapped ${assetMap.size} scenes and cover: ${!!coverPath}`);

  // 2. Upload and get URLs
  const urlMap = new Map<string, string>();

  if (coverPath) {
    const url = await uploadAsset(coverPath, gameSlug);
    if (url) urlMap.set('cover', url);
  }

  for (const [scene, filePath] of assetMap.entries()) {
    const url = await uploadAsset(filePath, gameSlug);
    if (url) urlMap.set(scene, url);
  }

  // 3. Process Markdown
  let content = fs.readFileSync(mdFilePath, 'utf-8');
  const lines = content.split('\n');
  const newLines: string[] = [];

  let currentScene: string | null = null;
  let inImageGenBlock = false;
  let title = 'New Game';

  // Extract Title
  const titleMatch = content.match(/^title:\s*(.+)$/m);
  if (titleMatch) {
    title = titleMatch[1].trim();
  }

  // Inject Cover
  if (urlMap.has('cover')) {
    // If cover doesn't start with quote, be safe
    const coverUrl = urlMap.get('cover');

    // Check if `cover:` field already exists
    if (content.match(/^cover:\s*h/m)) {
      // It exists, we should probably update it in the line processing loop or via regex
      // But Frontmatter is at top. Let's do regex replace for simplicity on the whole content
      content = content.replace(/^cover:\s*.*$/m, `cover: ${coverUrl}`);
    } else {
      // Insert after cover_prompt
      content = content.replace(/(^cover_prompt:.*$)/m, `$1\ncover: ${coverUrl}`);
    }

    // Refresh lines
    const updatedLines = content.split('\n');
    lines.length = 0;
    lines.push(...updatedLines);
  }

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('# ')) {
      currentScene = trimmed.substring(2).trim();
    }

    if (trimmed.startsWith('```image-gen')) {
      inImageGenBlock = true;
      newLines.push(line);
      continue;
    }

    if (inImageGenBlock) {
      if (trimmed.startsWith('```')) {
        inImageGenBlock = false;
        // Inject URL
        if (currentScene && urlMap.has(currentScene)) {
          newLines.push(`url: ${urlMap.get(currentScene)}`);
        }
        newLines.push(line);
      } else if (trimmed.startsWith('url:')) {
        // Drop existing url line to replace it
        continue;
      } else {
        newLines.push(line);
      }
    } else {
      newLines.push(line);
    }
  }

  const finalContent = newLines.join('\n');

  // Save locally
  fs.writeFileSync(mdFilePath, finalContent);
  console.log(`Updated markdown saved to ${mdFilePath}`);

  // 4. Submit to DB
  const userId = (config as any).userId;
  await createOrUpdateGame(gameSlug, title, finalContent, userId);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
