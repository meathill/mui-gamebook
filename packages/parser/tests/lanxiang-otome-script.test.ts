import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from '../src/index';

const source = readFileSync(join(__dirname, '../../../sites/lanxiang-xhs-tool/script.md'), 'utf8');

function parseOk() {
  const result = parse(source);
  if (!result.success) {
    throw new Error(result.error);
  }
  return result;
}

describe('lanxiang-xhs-tool/script.md', () => {
  it('可以被 gamebook parser 解析且无诊断', () => {
    const result = parseOk();
    expect(result.diagnostics ?? []).toHaveLength(0);
  });

  it('覆盖序章、四事件、终局与九个结局', () => {
    const { data } = parseOk();
    const ids = Object.keys(data.scenes);
    for (const id of [
      'start',
      'e1_night',
      'e2_after',
      'e3_night',
      'e4_climax',
      'end_resolve',
      'end_jinlou_he',
      'end_jinlou_be',
      'end_xingtang_he',
      'end_xingtang_be',
      'end_cuique_he',
      'end_cuique_be',
      'end_guihua_he',
      'end_guihua_be',
      'end_alone',
    ]) {
      expect(ids, id).toContain(id);
    }
    expect(ids.length).toBeGreaterThanOrEqual(35);
  });

  it('注册了四位可攻略角色', () => {
    const { data } = parseOk();
    const keys = Object.keys(data.ai?.characters ?? {});
    expect(keys).toEqual(expect.arrayContaining(['jinlou', 'xingtang', 'cuique', 'guihua']));
    expect(keys).not.toContain('cuoque');
  });

  it('if 条件使用 == 而非赋值 =', () => {
    const ifs = source.match(/\(if:[^)]+\)/g) ?? [];
    expect(ifs.length).toBeGreaterThan(0);
    for (const clause of ifs) {
      expect(clause, clause).not.toMatch(/(?<![=!<>])=(?!=)/);
    }
  });

  it('end_resolve 后序男主对更高优先级用严格大于防并列劫持', () => {
    const { data } = parseOk();
    const redirects = (data.scenes.end_resolve?.nodes ?? []).filter(
      (n) => n.type === 'redirect' && typeof n.condition === 'string',
    ) as Array<{ nextSceneId: string; condition: string }>;
    const xin = redirects.find((r) => r.nextSceneId === 'end_xingtang_he');
    expect(xin?.condition ?? '').toMatch(/favor_xingtang > favor_jinlou/);
    const gui = redirects.find((r) => r.nextSceneId === 'end_guihua_he');
    expect(gui?.condition ?? '').toMatch(/favor_guihua > favor_cuique/);
  });
});
