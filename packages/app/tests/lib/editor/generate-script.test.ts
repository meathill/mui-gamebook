import { parse } from '@mui-gamebook/parser';
import { describe, expect, it } from 'vitest';
import {
  buildCorrectionPrompt,
  buildGenerateScriptPrompt,
  buildReviseScriptPrompt,
  EXAMPLE_SCRIPT,
  hasSubstantialScript,
  stripCodeFence,
  trimDslSpecForFirstPass,
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

describe('trimDslSpecForFirstPass', () => {
  it('过滤掉标记区间内的内容，保留标记外的内容', () => {
    const spec = `前置内容
<!-- first-pass:exclude:start -->
被过滤的内容 A
<!-- first-pass:exclude:end -->
中间内容
<!-- first-pass:exclude:start -->
被过滤的内容 B
<!-- first-pass:exclude:end -->
末尾内容`;

    const trimmed = trimDslSpecForFirstPass(spec);
    expect(trimmed).toContain('前置内容');
    expect(trimmed).toContain('中间内容');
    expect(trimmed).toContain('末尾内容');
    expect(trimmed).not.toContain('被过滤的内容 A');
    expect(trimmed).not.toContain('被过滤的内容 B');
    expect(trimmed).not.toContain('first-pass:exclude');
  });

  it('没有标记区间时原样返回', () => {
    const spec = '没有任何标记的内容';
    expect(trimDslSpecForFirstPass(spec)).toBe(spec);
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

  it('修改提示词强制要求 state 与 ai.characters，并附上现有剧本与新故事信息', () => {
    const prompt = buildReviseScriptPrompt('DSL SPEC CONTENT', '现有剧本全文', '新增的故事信息');
    expect(prompt).toContain('state:');
    expect(prompt).toContain('ai.characters');
    expect(prompt).toContain('MANDATORY');
    expect(prompt).toContain('DSL SPEC CONTENT');
    expect(prompt).toContain('现有剧本全文');
    expect(prompt).toContain('新增的故事信息');
    expect(prompt).toContain('REVISED');
  });
});

describe('hasSubstantialScript', () => {
  it('game 为空时返回 false', () => {
    expect(hasSubstantialScript(null)).toBe(false);
    expect(hasSubstantialScript(undefined)).toBe(false);
  });

  it('只有一个 start 场景、无角色无变量时视为空白模板，返回 false', () => {
    expect(
      hasSubstantialScript({
        scenes: { start: {} } as never,
        ai: { characters: {} },
        initialState: {},
      }),
    ).toBe(false);
  });

  it('有多个场景时返回 true', () => {
    expect(
      hasSubstantialScript({
        scenes: { start: {}, next: {} } as never,
        ai: { characters: {} },
        initialState: {},
      }),
    ).toBe(true);
  });

  it('有角色时返回 true', () => {
    expect(
      hasSubstantialScript({
        scenes: { start: {} } as never,
        ai: { characters: { hero: { name: '英雄' } } } as never,
        initialState: {},
      }),
    ).toBe(true);
  });

  it('有变量时返回 true', () => {
    expect(
      hasSubstantialScript({
        scenes: { start: {} } as never,
        ai: { characters: {} },
        initialState: { health: 100 },
      }),
    ).toBe(true);
  });
});
