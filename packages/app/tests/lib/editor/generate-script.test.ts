import { parse } from '@mui-gamebook/parser';
import { describe, expect, it } from 'vitest';
import {
  buildCorrectionPrompt,
  buildGenerateScriptPrompt,
  EXAMPLE_SCRIPT,
  stripCodeFence,
  validateGeneratedScript,
} from '@/lib/editor/generate-script';

describe('EXAMPLE_SCRIPT（守护测试：示例必须与 parser 保持一致）', () => {
  it('示例剧本能被 parser 解析出非空 characters 和 state', () => {
    const result = parse(EXAMPLE_SCRIPT);
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(Object.keys(result.data.ai?.characters ?? {}).length).toBeGreaterThan(0);
    expect(Object.keys(result.data.initialState ?? {}).length).toBeGreaterThan(0);
    expect(result.data.scenes.start).toBeDefined();
  });

  it('示例剧本自身通过 validateGeneratedScript', () => {
    const validation = validateGeneratedScript(EXAMPLE_SCRIPT);
    expect(validation.ok).toBe(true);
  });
});

describe('validateGeneratedScript', () => {
  it('缺少 characters/state 时检出缺失', () => {
    const script = `---
title: "测试"
---

# start

你好。
`;
    const validation = validateGeneratedScript(script);
    expect(validation.ok).toBe(false);
    expect(validation.missingCharacters).toBe(true);
    expect(validation.missingState).toBe(true);
    expect(validation.parseError).toBeUndefined();
  });

  it('无法解析时返回 parseError', () => {
    const validation = validateGeneratedScript('没有 frontmatter 也没有场景');
    expect(validation.ok).toBe(false);
    expect(validation.parseError).toBeTruthy();
  });
});

describe('stripCodeFence', () => {
  it('剥离 markdown 代码块包裹', () => {
    expect(stripCodeFence('```markdown\n# start\n```')).toBe('# start');
    expect(stripCodeFence('# start')).toBe('# start');
  });
});

describe('prompt 构建', () => {
  it('生成提示词强制要求 state 与 ai.characters 并包含用户故事', () => {
    const prompt = buildGenerateScriptPrompt('DSL SPEC CONTENT', '我的故事大纲');
    expect(prompt).toContain('state:');
    expect(prompt).toContain('ai.characters');
    expect(prompt).toContain('MANDATORY');
    expect(prompt).toContain('DSL SPEC CONTENT');
    expect(prompt).toContain('我的故事大纲');
  });

  it('纠错提示词按缺失项生成，并附上原剧本', () => {
    const prompt = buildCorrectionPrompt('原始剧本内容', {
      ok: false,
      missingCharacters: true,
      missingState: false,
    });
    expect(prompt).toContain('ai.characters');
    expect(prompt).not.toContain('缺少 `state`');
    expect(prompt).toContain('原始剧本内容');

    const withParseError = buildCorrectionPrompt('x', {
      ok: false,
      parseError: 'Missing start scene',
      missingCharacters: true,
      missingState: true,
    });
    expect(withParseError).toContain('Missing start scene');
    expect(withParseError).toContain('缺少 `state`');
  });
});
