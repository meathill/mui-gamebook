import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parse, stringify } from '../src/index';
import type { Game, SceneNode } from '../src/types';

/**
 * 13 个 demo 的全量往返一致性（DSL v2 Phase 1 conformance）：
 * - stringify∘parse 必须幂等：第一遍序列化允许规范化（素材节点归位、`---` 重生成），
 *   但第二遍必须与第一遍逐字节一致
 * - 往返不允许丢数据：场景集合、每场景节点类型多重集、状态、AI 配置、extra 全等
 */
const demoDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../demo');

function listDemoFiles(): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(demoDir, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(path.join(demoDir, entry.name));
    } else if (entry.isDirectory()) {
      for (const sub of fs.readdirSync(path.join(demoDir, entry.name))) {
        if (sub.endsWith('.md')) files.push(path.join(demoDir, entry.name, sub));
      }
    }
  }
  return files.sort();
}

function nodeTypeCounts(nodes: SceneNode[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const n of nodes) {
    counts[n.type] = (counts[n.type] ?? 0) + 1;
  }
  return counts;
}

function structuralSummary(game: Game) {
  return {
    sceneIds: Object.keys(game.scenes).sort(),
    nodeCounts: Object.fromEntries(Object.entries(game.scenes).map(([id, s]) => [id, nodeTypeCounts(s.nodes)])),
    initialState: game.initialState,
    ai: game.ai,
    extra: game.extra,
    dsl_version: game.dsl_version,
  };
}

describe('demo 全量往返', () => {
  const files = listDemoFiles();

  it('找到全部 demo 剧本', () => {
    expect(files.length).toBeGreaterThanOrEqual(13);
  });

  for (const file of files) {
    const name = path.relative(demoDir, file);

    it(`${name}：stringify∘parse 幂等且无结构性数据丢失`, () => {
      const src = fs.readFileSync(file, 'utf-8');
      const r1 = parse(src);
      expect(r1.success).toBe(true);
      if (!r1.success) return;

      // demo 里不允许存在 error 级诊断（废弃围栏等已全部迁移）
      expect(r1.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);

      const out1 = stringify(r1.data);
      const r2 = parse(out1);
      expect(r2.success).toBe(true);
      if (!r2.success) return;

      // 幂等：第二遍序列化与第一遍逐字节一致
      expect(stringify(r2.data)).toBe(out1);

      // 无结构性丢失
      expect(structuralSummary(r2.data)).toEqual(structuralSummary(r1.data));
    });
  }
});
