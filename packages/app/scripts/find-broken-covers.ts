/**
 * 排查封面图指向失效外链（如 picsum.photos 测试占位图）的游戏记录
 *
 * 只读脚本：通过 wrangler d1 execute 查询远程 D1，不做任何写入。
 * 查到的记录需要在 CMS 编辑器里手动更新封面图。
 *
 * 使用方法：
 *   node --experimental-strip-types scripts/find-broken-covers.ts
 */

import { execFileSync } from 'node:child_process';

const DATABASE_NAME = 'mui-gamebook';
const SUSPECT_HOSTS = ['picsum.photos'];

function queryGamesWithSuspectCovers() {
  const pattern = SUSPECT_HOSTS.map((host) => `cover_image LIKE '%${host}%'`).join(' OR ');
  const sql = `SELECT id, slug, title, cover_image FROM Games WHERE ${pattern}`;

  const output = execFileSync(
    'npx',
    ['wrangler', 'd1', 'execute', DATABASE_NAME, '--remote', '--json', '--command', sql],
    { cwd: new URL('..', import.meta.url).pathname, encoding: 'utf-8' },
  );

  const [result] = JSON.parse(output) as [
    { results: Array<{ id: number; slug: string; title: string; cover_image: string }> },
  ];
  return result.results;
}

function main() {
  console.log(`正在查询 cover_image 包含 ${SUSPECT_HOSTS.join('/')} 的游戏记录...`);
  const rows = queryGamesWithSuspectCovers();

  if (rows.length === 0) {
    console.log('没有找到匹配的记录。');
    return;
  }

  console.log(`找到 ${rows.length} 条记录，请在 CMS 编辑器里手动更新封面图：\n`);
  for (const row of rows) {
    console.log(`- [id=${row.id}] ${row.title} (/play/${row.slug})`);
    console.log(`  cover_image: ${row.cover_image}\n`);
  }
}

main();
