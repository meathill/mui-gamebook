import fs from 'fs';
import path from 'path';
import { parse } from '@mui-gamebook/parser';

const demoDir = path.join(process.cwd(), '../../demo');

export function getPublishedGames() {
  if (!fs.existsSync(demoDir)) {
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
    return result.data;
  }
  return null;
}
