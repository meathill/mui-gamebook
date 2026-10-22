import { useState } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Editor } from '@tiptap/core';
import { parse } from '@roudanio/parser';
import RichEditor from '@/components/editor/RichEditor';
import { requestDslTool } from '@/lib/editor/extensions/dsl-tools';
import { findDslTargets } from '@/lib/editor/dsl-tools/targets';

const SOURCE =
  '---\ntitle: 测试\nstate:\n  gold: 3\nai:\n  characters:\n    hero:\n      name: 主角\n---\n\n# start\n\n正文\n\n* [开门] -> room (if: gold > 0) (timer: 10)\n\n# room\n\n到了';
function Harness({ onChange = () => {} }: { onChange?: (value: string) => void }) {
  const [content, setContent] = useState(SOURCE);
  return (
    <RichEditor
      content={content}
      variableNames={['gold']}
      characters={{ hero: { name: '主角' } }}
      onChange={(value) => {
        setContent(value);
        onChange(value);
      }}
    />
  );
}
async function getEditor() {
  await waitFor(() => expect(document.querySelector('.ProseMirror')).toBeTruthy());
  // TipTap 将实例挂在编辑器 DOM 上，测试使用真实事务而非模拟文本变化。
  return (document.querySelector('.ProseMirror') as HTMLElement & { editor: Editor }).editor;
}
beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  Range.prototype.getBoundingClientRect = vi.fn(() => ({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 0,
    height: 0,
    toJSON: () => ({}),
  }));
  Range.prototype.getClientRects = vi.fn(() => [] as unknown as DOMRectList);
});

describe('快速工具的双向表单', () => {
  it('工具栏创建选项、连接新场景，之后可再次打开编辑', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const editor = await getEditor();
    act(() => {
      editor.commands.setTextSelection(10);
    });
    fireEvent.click(screen.getByRole('button', { name: '添加选项' }));
    fireEvent.change(screen.getByLabelText('选项文字'), { target: { value: '进入森林' } });
    fireEvent.click(screen.getByLabelText('新建目标场景并连接'));
    fireEvent.change(screen.getByLabelText('新场景名称'), { target: { value: '森林' } });
    fireEvent.click(screen.getByRole('button', { name: '插入' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    const result = parse(onChange.mock.calls.at(-1)![0]);
    expect(result.success && result.data.scenes.start.nodes.at(-1)).toMatchObject({
      type: 'choice',
      text: '进入森林',
      nextSceneId: '森林',
    });
    const target = findDslTargets(editor.state.doc).find(
      (item) => item.kind === 'choice' && item.text.includes('进入森林'),
    )!;
    act(() => {
      requestDslTool(editor, { kind: 'choice', position: target.from });
    });
    expect(screen.getByLabelText('选项文字')).toHaveValue('进入森林');
    fireEvent.change(screen.getByLabelText('选项文字'), { target: { value: '探索森林' } });
    fireEvent.click(screen.getByRole('button', { name: '保存修改' }));
    expect(editor.state.doc.textContent).toContain('[探索森林]');
  });

  it('文本标记点击回填当前内容，取消不改动，拖选不弹窗', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const editor = await getEditor();
    const target = findDslTargets(editor.state.doc).find((item) => item.kind === 'choice')!;
    act(() => {
      editor.view.dispatch(editor.state.tr.insertText('再', target.from + 1));
    });
    onChange.mockClear();
    const element = editor.view.dom.querySelector('[data-dsl-tool="choice"]')!;
    const event = new MouseEvent('click', { bubbles: true });
    Object.defineProperty(event, 'target', { value: element });
    act(() => {
      editor.commands.setTextSelection(target.from);
      editor.view.someProp('handleClick', (handler) => handler(editor.view, target.from, event));
    });
    expect(screen.getByLabelText('选项文字')).toHaveValue('再开门');
    fireEvent.click(screen.getByRole('button', { name: '取消' }));
    expect(onChange).not.toHaveBeenCalled();
    act(() => {
      editor.commands.setTextSelection({ from: target.from, to: target.from + 3 });
      editor.view.someProp('handleClick', (handler) => handler(editor.view, target.from, event));
    });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('中文输入法 Enter 不提交，语法错误阻止保存', async () => {
    render(<Harness />);
    const editor = await getEditor();
    const target = findDslTargets(editor.state.doc).find((item) => item.kind === 'choice')!;
    act(() => {
      requestDslTool(editor, { kind: 'choice', position: target.from });
    });
    const field = screen.getByLabelText('选项文字');
    expect(fireEvent.keyDown(field, { key: 'Enter', isComposing: true })).toBe(false);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: '编辑表达式' })[0]);
    fireEvent.change(screen.getByLabelText('可用条件表达式'), { target: { value: 'gold > (' } });
    fireEvent.click(screen.getByRole('button', { name: '保存修改' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(editor.state.doc.textContent).toContain('(if: gold > 0)');
  });
});
