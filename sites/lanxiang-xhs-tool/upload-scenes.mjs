#!/usr/bin/env node
/** 上传 assets/scenes 与角色立绘到 muistory，并把 script.md 的 url 改成 CDN */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join, basename } from 'path';

const root = new URL('.', import.meta.url).pathname;
const key = process.env.MGB_API_KEY || process.env.KEY;
if (!key) {
  console.error('need MGB_API_KEY');
  process.exit(1);
}
const headers = {
  Authorization: `Bearer ${key}`,
  'Content-Type': 'application/json',
  Accept: 'application/json, text/event-stream',
};
const GAME_ID = 131;

async function rpc(method, params, id = 1) {
  let lastErr;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const res = await fetch('https://muistory.com/api/mcp', {
      method: 'POST',
      headers,
      body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
    });
    const text = await res.text();
    if (res.ok) return JSON.parse(text.startsWith('data:') ? text.slice(5).trim() : text);
    lastErr = new Error(`${res.status} ${text.slice(0, 200)}`);
    if (res.status === 401 || res.status === 429) {
      await new Promise((r) => setTimeout(r, 2000 * attempt));
      continue;
    }
    throw lastErr;
  }
  throw lastErr;
}
function payload(res) {
  const raw = res?.result?.content?.find((c) => c.type === 'text')?.text ?? '';
  try {
    return JSON.parse(raw);
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : raw;
  }
}
async function call(name, args, id) {
  const res = await rpc('tools/call', { name, arguments: args }, id);
  if (res.error) throw new Error(JSON.stringify(res.error));
  return payload(res);
}

await rpc('initialize', {
  protocolVersion: '2025-03-26',
  capabilities: {},
  clientInfo: { name: 'lanxiang-upload', version: '1' },
});

const mapPath = join(root, 'asset-urls.json');
const map = existsSync(mapPath) ? JSON.parse(readFileSync(mapPath, 'utf8')) : {};
const scenesDir = join(root, 'assets/scenes');
const files = readdirSync(scenesDir)
  .filter((f) => f.endsWith('.png'))
  .sort();
console.log('scene files', files.length, 'already', Object.keys(map).length);
let i = 0;
for (const file of files) {
  const localKey = `assets/scenes/${file}`;
  if (map[localKey]) {
    console.log('skip', file);
    continue;
  }
  i += 1;
  const path = join(scenesDir, file);
  const data = readFileSync(path).toString('base64');
  const res = await call(
    'uploadAsset',
    {
      gameId: GAME_ID,
      data,
      contentType: 'image/png',
      fileName: file,
      type: 'scene',
    },
    100 + i,
  );
  const url = res.url;
  if (!url) throw new Error('no url ' + file + ' ' + JSON.stringify(res).slice(0, 160));
  map[`assets/scenes/${file}`] = url;
  writeFileSync(mapPath, JSON.stringify(map, null, 2));
  console.log(i, file, url);
}

// characters
for (const id of ['jinlou', 'xingtang', 'cuique', 'guihua']) {
  const file = join(root, `assets/${id}.png`);
  if (!existsSync(file)) continue;
  const res = await call(
    'uploadAsset',
    {
      gameId: GAME_ID,
      data: readFileSync(file).toString('base64'),
      contentType: 'image/png',
      fileName: `${id}.png`,
      type: 'character',
      characterId: id,
    },
    200,
  );
  map[`assets/${id}.png`] = res.url;
  console.log('char', id, res.url);
}
const cover = join(root, 'assets/cover.png');
if (existsSync(cover)) {
  const res = await call(
    'uploadAsset',
    {
      gameId: GAME_ID,
      data: readFileSync(cover).toString('base64'),
      contentType: 'image/png',
      fileName: 'cover.png',
      type: 'cover',
    },
    201,
  );
  map['assets/cover.png'] = res.url;
  console.log('cover', res.url);
  await call('updateGameMeta', { gameId: GAME_ID, coverImage: res.url }, 202);
}

writeFileSync(join(root, 'asset-urls.json'), JSON.stringify(map, null, 2));

let dsl = readFileSync(join(root, 'script.md'), 'utf8');
for (const [local, remote] of Object.entries(map)) {
  dsl = dsl.split(local).join(remote);
}
writeFileSync(join(root, 'script.md'), dsl);
const set = await call('setGameDsl', { gameId: GAME_ID, content: dsl }, 300);
console.log('setGameDsl', set);
console.log('done', Object.keys(map).length);
