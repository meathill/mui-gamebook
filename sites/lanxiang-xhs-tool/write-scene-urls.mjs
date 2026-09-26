#!/usr/bin/env node
/** 将 assets/scenes/*.png 作为本地路径写回 script.md 的场景 image.url */
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const root = new URL('.', import.meta.url).pathname;
const scenesDir = join(root, 'assets/scenes');
const scriptPath = join(root, 'script.md');
let dsl = readFileSync(scriptPath, 'utf8');
let n = 0;
for (const file of readdirSync(scenesDir)) {
  if (!file.endsWith('.png')) continue;
  const id = file.replace(/\.png$/, '');
  const rel = `assets/scenes/${file}`;
  const re = new RegExp(`(# ${id}\\n\`\`\`yaml\\nimage:\\n(?:  .+\\n)*?)(\`\`\`)`);
  if (!re.test(dsl)) {
    console.log('miss block', id);
    continue;
  }
  if (dsl.includes(`url: ${rel}`)) continue;
  dsl = dsl.replace(re, `$1  url: ${rel}\n$2`);
  n += 1;
}
writeFileSync(scriptPath, dsl);
console.log('updated urls', n, 'file exists', existsSync(scenesDir));
