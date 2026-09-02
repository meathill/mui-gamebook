/**
 * 修复封面图指向 picsum.photos 的失效记录，统一替换为本地占位
 *
 * 使用方法：
 *   node --experimental-strip-types scripts/fix-broken-covers.ts          # 预览（dry-run）
 *   node --experimental-strip-types scripts/fix-broken-covers.ts --apply    # 实际写入远程 D1
 *
 * 原理：与 find-broken-covers.ts 同库同表，UPDATE Games SET cover_image='/images/placeholder-cover-400x600.png'
 *       WHERE cover_image LIKE '%picsum.photos%'
 *       本地已有图片容错（image-loader + 组件兜底），即使不跑此脚本也不会再裂图；
 *       但清洗 DB 能让数据更干净、减少未来排查噪音。
 */

import { execFileSync } from 'node:child_process';

const DATABASE_NAME = 'mui-gamebook';
const PLACEHOLDER = '/images/placeholder-cover-400x600.png';
const DRY_RUN = !process.argv.includes('--apply');

function query(sql: string): unknown {
  const output = execFileSync(
    'npx',
    ['wrangler', 'd1', 'execute', DATABASE_NAME, '--remote', '--json', '--command', sql],
    { cwd: new URL('..', import.meta.url).pathname, encoding: 'utf-8' },
  );
  return JSON.parse(output);
}

function main() {
  const selectSql = `SELECT id, slug, title, cover_image FROM Games WHERE cover_image LIKE '%picsum.photos%'`;
  console.log('查询待修复记录...');
  const [result] = query(selectSql) as [
    { results: Array<{ id: number; slug: string; title: string; cover_image: string }> },
  ];
  const rows = result?.results ?? [];
  if (rows.length === 0) {
    console.log('没有找到需要修复的记录。');
    return;
  }
  console.log(`找到 ${rows.length} 条记录：`);
  for (const r of rows) {
    console.log(`- [id=${r.id}] ${r.title} (/play/${r.slug}) cover_image=${r.cover_image}`);
  }
  if (DRY_RUN) {
    console.log(`\n[DRY-RUN] 未写入。如需实际修复，请加 --apply 参数。`);
    console.log(`将执行: UPDATE Games SET cover_image='${PLACEHOLDER}' WHERE cover_image LIKE '%picsum.photos%'`);
    return;
  }
  console.log(`\n正在写入 ${rows.length} 条 ...`);
  const updateSql = `UPDATE Games SET cover_image='${PLACEHOLDER}' WHERE cover_image LIKE '%picsum.photos%'`;
  const out = query(updateSql);
  console.log('写入完成:', JSON.stringify(out, null, 2));
}

main();
