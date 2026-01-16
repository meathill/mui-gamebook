import fs from 'node:fs';
import path from 'node:path';
import { ApiService } from '../packages/asset-generator/src/lib/upload/api-service';

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed: Record<string, string | boolean> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
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

// Regex to find scenes: Capture: 1=ID, 2=Content
const SCENE_REGEX = /(^|\n)#\s*([\w-]+)\n([\s\S]*?)(?=(?:\n#\s*[\w-]+)|$)/g;

function migrateContent(content: string): string {
  const scenesFound: any[] = [];
  let match;
  while ((match = SCENE_REGEX.exec(content)) !== null) {
    scenesFound.push({
      fullMatch: match[0],
      prefix: match[1],
      id: match[2],
      body: match[3],
      index: match.index,
    });
  }

  if (scenesFound.length === 0) {
    return content;
  }

  // Start with everything before first scene
  let newContent = content.substring(0, scenesFound[0].index);

  for (const scene of scenesFound) {
    let body = scene.body;
    // Initialize metadata parts array
    const metadataParts: string[] = [];

    // Process Blocks
    // Image
    const imageBlockRegex = /```image-gen\n([\s\S]*?)```/;
    const imageMatch = body.match(imageBlockRegex);
    let imageMetadata = '';

    if (imageMatch) {
      body = body.replace(imageBlockRegex, '').trim();
      const indented = imageMatch[1]
        .trim()
        .split('\n')
        .map((l: string) => '  ' + l)
        .join('\n');
      imageMetadata = `image:\n${indented}`;
    }

    // Audio
    const audioBlockRegex = /```audio-gen\n([\s\S]*?)```/;
    const audioMatch = body.match(audioBlockRegex);
    let audioMetadata = '';

    if (audioMatch) {
      body = body.replace(audioBlockRegex, '').trim();
      const indented = audioMatch[1]
        .trim()
        .split('\n')
        .map((l: string) => '  ' + l)
        .join('\n');
      audioMetadata = `audio:\n${indented}`;
    }

    // Minigame
    const minigameBlockRegex = /```minigame-gen\n([\s\S]*?)```/;
    const minigameMatch = body.match(minigameBlockRegex);
    let minigameMetadata = '';

    if (minigameMatch) {
      body = body.replace(minigameBlockRegex, '').trim();
      const indented = minigameMatch[1]
        .trim()
        .split('\n')
        .map((l: string) => '  ' + l)
        .join('\n');
      minigameMetadata = `minigame:\n${indented}`;
    }

    // Video
    const videoBlockRegex = /```video-gen\n([\s\S]*?)```/;
    const videoMatch = body.match(videoBlockRegex);
    let videoMetadata = '';

    if (videoMatch) {
      body = body.replace(videoBlockRegex, '').trim();
      const indented = videoMatch[1]
        .trim()
        .split('\n')
        .map((l: string) => '  ' + l)
        .join('\n');
      videoMetadata = `video:\n${indented}`;
    }

    // Check for existing --- metadata block
    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n/;
    const frontmatterMatch = body.match(frontmatterRegex);
    if (frontmatterMatch) {
      const existingYaml = frontmatterMatch[1].trim();
      // Remove it from body
      body = body.replace(frontmatterRegex, '').trim();
      // Add to metadata parts if not already handled (though ideally we merge or just take it)
      // Since we are migrating, we assume we want to convert it.
      if (!metadataParts.includes(existingYaml)) {
        metadataParts.unshift(existingYaml);
      }
    }

    // Construct new scene
    let newScene = `${scene.prefix}# ${scene.id}\n`;

    // Populate metadata parts from individual matches
    if (imageMetadata) metadataParts.push(imageMetadata);
    if (audioMetadata) metadataParts.push(audioMetadata);
    if (videoMetadata) metadataParts.push(videoMetadata);
    if (minigameMetadata) metadataParts.push(minigameMetadata);

    // If we found existing yaml in frontmatter, we prepend it or merge it.
    // Simplified: Just output all metadata parts in one yaml block or separate?
    // The parser supports one yaml block at the start. So we should combine them if possible,
    // or just rely on the fact that usually there's only one type or they were separate.
    // But `metadataParts` collects from `image-gen` etc.

    // Let's combine them into a single string for the block
    const finalMetadata = metadataParts.join('\n');

    if (finalMetadata.length > 0) {
      newScene += `\`\`\`yaml\n${finalMetadata}\n\`\`\`\n\n`;
    }

    newScene += body;
    newContent += newScene;
  }

  return newContent;
}

async function main() {
  const argv = parseArgs();
  const filePath = argv.file as string;
  const slug = argv.slug as string;
  const dryRun = !!argv.dryRun;

  if (!filePath && !slug) {
    console.error('Usage: npx tsx scripts/migrate-game-script.ts [--file <path>] [--slug <game-slug>] [--dry-run]');
    process.exit(1);
  }

  if (filePath) {
    console.log(`Migrating local file: ${filePath}`);
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      process.exit(1);
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    const migrated = migrateContent(content);

    if (content === migrated) {
      console.log('No changes needed.');
    } else {
      console.log('Migration changes detected.');
      if (!dryRun) {
        fs.writeFileSync(filePath, migrated, 'utf-8');
        console.log('File updated.');
      } else {
        console.log('Dry run: File would be updated.');
      }
    }
  }

  if (slug) {
    console.log(`Migrating remote game with slug: ${slug}`);

    // Config logic similar to upload-game.ts
    const configPath = path.join(process.cwd(), '.agent/config.json');
    let config = { apiUrl: 'https://muistory.com' };
    if (fs.existsSync(configPath)) {
      try {
        Object.assign(config, JSON.parse(fs.readFileSync(configPath, 'utf-8')));
      } catch {}
    }
    const API_URL = config.apiUrl || process.env.API_URL;
    const ADMIN_PASSWORD = process.env.MUI_ADMIN_PASSWORD;

    if (!ADMIN_PASSWORD) {
      if (!dryRun) {
        console.error('MUI_ADMIN_PASSWORD is required for remote migration');
        return;
      }
    }

    if (!API_URL) {
      console.error('API_URL is required.');
      process.exit(1);
    }

    const apiService = new ApiService(API_URL, ADMIN_PASSWORD!);

    try {
      const game = await apiService.getGame(slug);
      if (!game || !game.content) {
        console.error('Game content is empty or not found.');
        process.exit(1);
      }

      const migrated = migrateContent(game.content);

      if (game.content === migrated) {
        console.log('No changes needed.');
      } else {
        console.log('Migration changes detected.');
        if (!dryRun) {
          await apiService.submitGame({
            ...game,
            content: migrated,
          });
          console.log('Remote game updated.');
        } else {
          console.log('Dry run: Remote game not updated.');
        }
      }
    } catch (e: any) {
      console.error('Remote migration failed:', e);
      process.exit(1);
    }
  }
}

main().catch(console.error);
