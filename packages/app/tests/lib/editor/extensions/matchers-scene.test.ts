import { describe, it, expect } from 'vitest';
import { extractSceneIds, extractReferencedVariables, findVariableMatches } from '@/lib/editor/extensions/matchers';

describe('extractSceneIds', () => {
  function makeMockDoc(headings: Array<{ level: number; text: string }>) {
    return {
      descendants(cb: (node: any, pos: number) => boolean | void) {
        headings.forEach((h, i) => {
          cb(
            {
              type: { name: 'heading' },
              attrs: { level: h.level },
              textContent: h.text,
            },
            i * 10,
          );
        });
      },
    };
  }

  it('提取所有 H1 标题', () => {
    const doc = makeMockDoc([
      { level: 1, text: 'start' },
      { level: 2, text: 'not_a_scene' },
      { level: 1, text: 'battle' },
      { level: 1, text: 'ending' },
    ]);
    expect(extractSceneIds(doc)).toEqual(['start', 'battle', 'ending']);
  });

  it('忽略非 H1 标题', () => {
    const doc = makeMockDoc([
      { level: 2, text: 'h2_title' },
      { level: 3, text: 'h3_title' },
    ]);
    expect(extractSceneIds(doc)).toEqual([]);
  });

  it('空文档返回空数组', () => {
    const doc = { descendants: () => {} };
    expect(extractSceneIds(doc)).toEqual([]);
  });

  it('去除标题前后空格', () => {
    const doc = makeMockDoc([{ level: 1, text: '  start  ' }]);
    expect(extractSceneIds(doc)).toEqual(['start']);
  });
});

describe('extractReferencedVariables', () => {
  function makeMockDoc(texts: string[]) {
    return {
      descendants(cb: (node: any) => boolean | void) {
        texts.forEach((t) => {
          cb({ isText: true, text: t });
        });
      },
    };
  }

  it('提取所有变量引用', () => {
    const doc = makeMockDoc(['你有 {{gold}} 金币', '生命 {{health}}']);
    expect(extractReferencedVariables(doc)).toEqual(['gold', 'health']);
  });

  it('去重', () => {
    const doc = makeMockDoc(['{{gold}} 和 {{gold}}']);
    expect(extractReferencedVariables(doc)).toEqual(['gold']);
  });

  it('无变量返回空', () => {
    const doc = makeMockDoc(['普通文本']);
    expect(extractReferencedVariables(doc)).toEqual([]);
  });
});
