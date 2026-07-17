import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { assertNoMassiveShrink, migrateContent } from '../../../scripts/migrate-game-script';

describe('migrateContent - Unicode 场景 ID（issue #8）', () => {
  it('中文标题的场景被正确切分，正文不被吞掉', () => {
    const input = [
      '---',
      'title: 测试',
      '---',
      '',
      '# start',
      '',
      '正文一。',
      '',
      '# 中文场景',
      '',
      '```image-gen',
      'prompt: 舞会大厅',
      '```',
      '',
      '正文二。',
      '',
    ].join('\n');

    const output = migrateContent(input);

    expect(output).toContain('# 中文场景');
    expect(output).toContain('正文二。');
    // 旧围栏被重建为 yaml 元数据块
    expect(output).not.toContain('```image-gen');
    expect(output).toContain('```yaml');
    expect(output).toContain('prompt: 舞会大厅');
  });

  it('混合 ASCII 与中文场景时不缩水', () => {
    const input = [
      '# start',
      '',
      '正文一。',
      '',
      '# 场景-2',
      '',
      '正文二。',
      '',
      '# 第2章_序',
      '',
      '正文三。',
      '',
    ].join('\n');

    const output = migrateContent(input);

    for (const fragment of ['# start', '正文一。', '# 场景-2', '正文二。', '# 第2章_序', '正文三。']) {
      expect(output).toContain(fragment);
    }
  });
});

describe('assertNoMassiveShrink - 防缩水护栏（生产实测小红帽 4233→1095 字符事故的回归测试）', () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    exitSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('缩水超过 40% 时中止并报错', () => {
    const before = 'x'.repeat(4233);
    const after = 'x'.repeat(1095); // 与生产事故同等缩水幅度

    assertNoMassiveShrink(before, after);

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('中止'));
  });

  it('缩水未超过 40% 时放行', () => {
    const before = 'x'.repeat(1000);
    const after = 'x'.repeat(650);

    assertNoMassiveShrink(before, after);

    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('内容增长（正常迁移场景）时放行', () => {
    const before = 'x'.repeat(1000);
    const after = 'x'.repeat(1200);

    assertNoMassiveShrink(before, after);

    expect(exitSpy).not.toHaveBeenCalled();
  });
});
