#!/usr/bin/env node
/**
 * 将 script.md 经 MCP 发布到 muistory。
 * 用法：
 *   MGB_API_KEY=mgb_xxx node publish.mjs
 *   或先在 muistory.com → 工作台 → API 密钥 创建 key
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const API = process.env.MGB_MCP_URL || 'https://muistory.com/api/mcp';
const key = process.env.MGB_API_KEY || process.env.MUI_GAMEBOOK_API_KEY;
if (!key) {
  console.error('缺少 MGB_API_KEY（muistory 工作台创建的 API Key）');
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${key}`,
  'Content-Type': 'application/json',
  Accept: 'application/json, text/event-stream',
};

async function rpc(method, params, id = 1) {
  const res = await fetch(API, {
    method: 'POST',
    headers,
    body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${text.slice(0, 400)}`);
  if (text.startsWith('data:') || text.includes('\ndata:')) {
    for (const line of text.split('\n')) {
      if (line.startsWith('data:')) return JSON.parse(line.slice(5).trim());
    }
  }
  return JSON.parse(text);
}

function readToolText(res) {
  const raw = res?.result?.content?.find((c) => c.type === 'text')?.text ?? '';
  try {
    return JSON.parse(raw);
  } catch {
    // createGame 等工具可能返回「说明文字 + JSON」混合体
    const embedded = raw.match(/\{[\s\S]*\}/);
    if (embedded) {
      try {
        return JSON.parse(embedded[0]);
      } catch {
        /* fallthrough */
      }
    }
    return raw;
  }
}

async function call(name, args, id) {
  const res = await rpc('tools/call', { name, arguments: args }, id);
  if (res.error) throw new Error(`${name}: ${JSON.stringify(res.error)}`);
  return readToolText(res);
}

await rpc('initialize', {
  protocolVersion: '2025-03-26',
  capabilities: {},
  clientInfo: { name: 'lanxiang-publish', version: '1.0.0' },
});

const title = '兰香如故·性转逆后宫';
const description =
  '你是顶替亡女入府的许兰香。冷面嫡长子林锦楼、新贵公子赵星棠、江湖游医杜翠雀、商帮少东薛桂花——态度皆随你而变。四场风波、三十余次抉择，洗冤与心动，结局由你写就。';
const dsl = readFileSync(join(__dirname, 'script.md'), 'utf8');

const created = await call('createGame', { title, description }, 2);
const gameId = created.id ?? created.gameId ?? created?.data?.id;
const slug = created.slug ?? created?.data?.slug;
if (!gameId) throw new Error(`createGame 无 id：${JSON.stringify(created)}`);
console.log('created', { gameId, slug });

const dry = await call('setGameDsl', { gameId, content: dsl, dryRun: true }, 3);
console.log('dryRun', dry);
if (dry?.success === false || dry?.ok === false) throw new Error('dryRun 未通过');

await call('setGameDsl', { gameId, content: dsl }, 4);
console.log('setGameDsl ok');

await call(
  'updateGameMeta',
  {
    gameId,
    title,
    description,
    tags: ['性转', '逆后宫', '明代宅门', '多结局', '兰香如故'],
    published: true,
  },
  5,
);
console.log('published');

const info = await call('getGameInfo', { gameId }, 6);
console.log('info', info);
console.log(`播放页: https://muistory.com/play/${slug ?? '<slug>'}`);
console.log('请把 index.html 中 PLAY_URL 的 slug 替换为真实 slug。');
