import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from '@mui-gamebook/parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Navigate up from packages/app/src/lib to root/demo
const demoDir = path.resolve(__dirname, '../../../../demo');

export function getPublishedGames() {
  if (!fs.existsSync(demoDir)) {
    console.warn(`Demo directory not found at: ${demoDir}`);
    return [];
  }

  const files = fs.readdirSync(demoDir).filter(file => file.endsWith('.md'));
  const games = [];

  for (const file of files) {
    const content = fs.readFileSync(path.join(demoDir, file), 'utf-8');
    const result = parse(content);

    if (result.success && result.data.published) {
      const { scenes, ...metadata } = result.data;
      games.push({
        slug: file.replace('.md', ''),
        ...metadata,
      });
    }
  }
  return games;
}

export function getGameBySlug(slug: string) {
  const filePath = path.join(demoDir, `${slug}.md`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const result = parse(content);

  if (result.success) {
    // Only return if published
    if (result.data.published) {
      return result.data;
    }
  }
  return null;
}
