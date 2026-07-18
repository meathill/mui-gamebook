import { describe, expect, it } from 'vitest';
import { buildAssessStoryPrompt, parseAssessStoryResult } from '@/lib/editor/clarify-story';

describe('buildAssessStoryPrompt', () => {
  it('包含用户故事片段与 ready/questions 输出格式要求，不包含 DSL 相关内容', () => {
    const prompt = buildAssessStoryPrompt('一个女孩的故事');
    expect(prompt).toContain('一个女孩的故事');
    expect(prompt).toContain('ready');
    expect(prompt).toContain('questions');
    expect(prompt).not.toContain('DSL');
  });
});

describe('parseAssessStoryResult', () => {
  it('ready: true 时问题列表为空', () => {
    const result = parseAssessStoryResult('{"ready": true, "questions": []}');
    expect(result).toEqual({ ready: true, questions: [] });
  });

  it('ready: false 时解析追问，最多保留 3 个', () => {
    const result = parseAssessStoryResult('{"ready": false, "questions": ["问题1", "问题2", "问题3", "问题4"]}');
    expect(result.ready).toBe(false);
    expect(result.questions).toEqual(['问题1', '问题2', '问题3']);
  });

  it('剥离代码块包裹', () => {
    const result = parseAssessStoryResult('```json\n{"ready": false, "questions": ["问题1"]}\n```');
    expect(result).toEqual({ ready: false, questions: ['问题1'] });
  });

  it('过滤空字符串问题', () => {
    const result = parseAssessStoryResult('{"ready": false, "questions": ["问题1", "", "  "]}');
    expect(result.questions).toEqual(['问题1']);
  });

  it('questions 为空数组时即使 ready: false 也视为已就绪，避免卡住用户', () => {
    const result = parseAssessStoryResult('{"ready": false, "questions": []}');
    expect(result).toEqual({ ready: true, questions: [] });
  });

  it('解析失败或格式不符时退化为已就绪，不阻塞调用方', () => {
    expect(parseAssessStoryResult('不是合法 JSON')).toEqual({ ready: true, questions: [] });
    expect(parseAssessStoryResult('{"other": "field"}')).toEqual({ ready: true, questions: [] });
    expect(parseAssessStoryResult('{"ready": false, "questions": "不是数组"}')).toEqual({
      ready: true,
      questions: [],
    });
  });
});
