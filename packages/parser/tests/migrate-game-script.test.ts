import { describe, expect, it } from 'vitest';
import { migrateContent } from '../../../scripts/migrate-game-script';

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
