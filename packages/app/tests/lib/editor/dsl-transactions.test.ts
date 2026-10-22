import { afterEach, describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import { parse } from '@roudanio/parser';
import { DslTools } from '@/lib/editor/extensions/dsl-tools';
import { DslText } from '@/lib/editor/extensions/dsl-text';
import { beginDslSession, mapDslSession } from '@/lib/editor/dsl-tools/session';
import { applyDslEdit } from '@/lib/editor/dsl-tools/apply';
import { getEditorMarkdown } from '@/lib/editor/dsl-tools/markdown';
import { findDslTargets } from '@/lib/editor/dsl-tools/targets';

const editors: Editor[] = [];
function setup(
  body = '# start\n\n正文\n\n* [开门] -> room (audio: https://a.test/a.mp3) (timer: 3)\n\n# room\n\n房间',
) {
  const editor = new Editor({
    extensions: [StarterKit.configure({ text: false }), DslText, Markdown.configure({ html: false }), DslTools],
    content: body,
  });
  editor.view.dispatch(
    editor.state.tr
      .setDocAttribute(
        'dslFrontmatter',
        '---\ntitle: 测试\nstate:\n  health:\n    value: 1\n    trigger:\n      condition: "<= 0"\n      scene: room\n---\n',
      )
      .setMeta('addToHistory', false),
  );
  editors.push(editor);
  return editor;
}
const context = { variables: ['gold'], characters: ['hero'] };
afterEach(() => {
  for (const editor of editors.splice(0)) editor.destroy();
});

describe('DSL 定点编辑事务', () => {
  it('修改选项并一次撤销，保留语音和扩展子句', () => {
    const editor = setup();
    const before = getEditorMarkdown(editor);
    const target = findDslTargets(editor.state.doc).find((item) => item.kind === 'choice')!;
    const session = beginDslSession(editor, { kind: 'choice', position: target.from }, []);
    applyDslEdit(editor, session, { ...session.draft, text: '推开门' }, context);
    expect(getEditorMarkdown(editor)).toContain('[推开门]');
    expect(getEditorMarkdown(editor)).toContain('(timer: 3)');
    editor.commands.undo();
    expect(getEditorMarkdown(editor)).toBe(before);
    editor.commands.redo();
    expect(getEditorMarkdown(editor)).toContain('[推开门]');
  });

  it('改名同步引用和变量触发器，撤销一起还原', () => {
    const editor = setup();
    const before = getEditorMarkdown(editor);
    const scene = findDslTargets(editor.state.doc).find((item) => item.kind === 'scene' && item.text === 'room')!;
    const session = beginDslSession(editor, { kind: 'scene', position: scene.from }, []);
    applyDslEdit(editor, session, { ...session.draft, name: '房间' }, context);
    const result = parse(getEditorMarkdown(editor));
    expect(result.success && result.data.scenes.start.nodes.at(-1)).toMatchObject({ nextSceneId: '房间' });
    expect(result.success && result.data.initialState.health).toMatchObject({ trigger: { scene: '房间' } });
    editor.commands.undo();
    expect(getEditorMarkdown(editor)).toBe(before);
  });

  it('选项与新目标场景作为同一个事务插入', () => {
    const editor = setup();
    const session = beginDslSession(editor, { kind: 'choice', position: 10 }, []);
    applyDslEdit(editor, session, { ...session.draft, text: '进森林', target: '森林', createTarget: true }, context);
    const result = parse(getEditorMarkdown(editor));
    expect(result.success && result.data.scenes['森林']).toBeTruthy();
    expect(result.success && result.data.scenes.start.nodes.at(-1)).toMatchObject({
      type: 'choice',
      nextSceneId: '森林',
    });
    editor.commands.undo();
    expect(getEditorMarkdown(editor)).not.toContain('森林');
  });

  it('其他位置的输入映射定位，目标自身改变则阻止提交', () => {
    const editor = setup();
    const target = findDslTargets(editor.state.doc).find((item) => item.kind === 'choice')!;
    const session = beginDslSession(editor, { kind: 'choice', position: target.from }, []);
    editor.on('transaction', ({ transaction }) => mapDslSession(session, transaction));
    editor.view.dispatch(editor.state.tr.insertText('新', 9));
    applyDslEdit(editor, session, { ...session.draft, text: '打开' }, context);
    const current = findDslTargets(editor.state.doc).find((item) => item.kind === 'choice')!;
    const next = beginDslSession(editor, { kind: 'choice', position: current.from }, []);
    editor.on('transaction', ({ transaction }) => mapDslSession(next, transaction));
    editor.view.dispatch(editor.state.tr.insertText('另', current.from + 1));
    expect(() => applyDslEdit(editor, next, next.draft, context)).toThrow('发生变化');
  });

  it('取消不会删除斜杠文本，确认与替换共用一次撤销', () => {
    const editor = setup('# start\n\n/选项\n\n# room');
    const before = getEditorMarkdown(editor);
    const session = beginDslSession(editor, { kind: 'choice', position: 10, slashRange: { from: 8, to: 11 } }, []);
    expect(getEditorMarkdown(editor)).toBe(before);
    applyDslEdit(editor, session, { ...session.draft, text: '走', target: 'room' }, context);
    editor.commands.undo();
    expect(getEditorMarkdown(editor)).toBe(before);
  });
});
