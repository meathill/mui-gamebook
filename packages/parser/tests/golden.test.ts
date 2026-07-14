import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parse } from '../src/index';

/**
 * 黄金样例（conformance 锁）：代表性 demo 的完整 AST 快照。
 * 大型 demo 用 roundtrip.test.ts 的结构摘要覆盖，这里只锁小而全的样本，
 * 避免仓库里堆几 MB 快照。解析行为变化会在这里显式暴露为快照 diff。
 */
const demoDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../demo');

const GOLDEN_SAMPLES = [
  'hello_world.md', // 最小样本
  'little_red_riding_hood.md', // 规范范例游戏
  'apocalypse-train.md', // 现行语法最全（minigame/变量元数据/条件选项）
];

describe('golden AST 快照', () => {
  for (const name of GOLDEN_SAMPLES) {
    it(name, async () => {
      const src = fs.readFileSync(path.join(demoDir, name), 'utf-8');
      const result = parse(src);
      expect(result.success).toBe(true);
      if (!result.success) return;

      const snapshot = JSON.stringify({ game: result.data, diagnostics: result.diagnostics }, null, 2);
      await expect(snapshot).toMatchFileSnapshot(`./golden/${name}.json`);
    });
  }
});
