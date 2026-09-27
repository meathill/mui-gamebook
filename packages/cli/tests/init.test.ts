import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { initProject } from '../src/commands/init';
import { validateScriptContent } from '../src/commands/validate';

const TEST_DIR = path.resolve(__dirname, 'temp_init_test');

describe('initProject', () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  it('成功在指定路径生成起步模板，且模板 100% 通过验证', () => {
    const target = path.join(TEST_DIR, 'my-story.md');
    const res = initProject(target);
    expect(res.success).toBe(true);
    expect(fs.existsSync(target)).toBe(true);

    const content = fs.readFileSync(target, 'utf-8');
    const report = validateScriptContent(content, target);
    expect(report.valid).toBe(true);
    expect(report.errors).toHaveLength(0);
    expect(report.stats.scenesCount).toBeGreaterThan(3);
    expect(report.stats.endingsCount).toBeGreaterThan(1);
  });

  it('文件已存在时拒绝覆盖', () => {
    const target = path.join(TEST_DIR, 'exists.md');
    fs.writeFileSync(target, 'already exists', 'utf-8');

    const res = initProject(target);
    expect(res.success).toBe(false);
    expect(res.message).toContain('已存在');
  });
});
