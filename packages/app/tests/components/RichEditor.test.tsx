import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import RichEditor, { type RichEditorHandle } from '@/components/editor/RichEditor';

const MULTI_SCENE_CONTENT = `# start

开始场景。

# forest

森林场景。
`;

const FRONTMATTER_CONTENT = `---
title: "测试游戏"
---

# start

开始场景。
`;

async function waitForMount() {
  await waitFor(() => {
    expect(document.querySelector('.ProseMirror')).toBeTruthy();
  });
}

describe('RichEditor', () => {
  it('渲染出 ProseMirror 编辑区和工具栏', async () => {
    render(
      <RichEditor
        content="# start\n\nhi"
        onChange={() => {}}
      />,
    );

    await waitForMount();

    expect(screen.getByTitle('加粗 (Ctrl+B)')).toBeInTheDocument();
    expect(screen.getByTitle('撤销 (Ctrl+Z)')).toBeInTheDocument();
  });

  it('挂载时用 onScenesChange 上报从内容中提取的场景 ID 列表（按 H1 标题）', async () => {
    const onScenesChange = vi.fn();
    render(
      <RichEditor
        content={MULTI_SCENE_CONTENT}
        onChange={() => {}}
        onScenesChange={onScenesChange}
      />,
    );

    await waitForMount();

    expect(onScenesChange).toHaveBeenCalledWith(['start', 'forest']);
  });

  it('frontmatter 块不会出现在可编辑正文里', async () => {
    render(
      <RichEditor
        content={FRONTMATTER_CONTENT}
        onChange={() => {}}
      />,
    );

    await waitForMount();

    const proseMirror = document.querySelector('.ProseMirror');
    expect(proseMirror?.textContent).not.toContain('title:');
    expect(proseMirror?.textContent).not.toContain('---');
    expect(proseMirror?.textContent).toContain('开始场景');
  });

  it('撤销/重做按钮在没有历史记录时初始为禁用', async () => {
    render(
      <RichEditor
        content="# start\n\nhi"
        onChange={() => {}}
      />,
    );

    await waitForMount();

    expect(screen.getByTitle('撤销 (Ctrl+Z)')).toBeDisabled();
    expect(screen.getByTitle('重做 (Ctrl+Shift+Z)')).toBeDisabled();
  });

  it('onEditorReady 暴露 scrollToScene 方法', async () => {
    const onEditorReady = vi.fn();
    render(
      <RichEditor
        content={MULTI_SCENE_CONTENT}
        onChange={() => {}}
        onEditorReady={onEditorReady}
      />,
    );

    await waitForMount();

    expect(onEditorReady).toHaveBeenCalledTimes(1);
    const handle = onEditorReady.mock.calls[0][0] as RichEditorHandle;
    expect(typeof handle.scrollToScene).toBe('function');
    // 场景存在时不应该抛错
    expect(() => handle.scrollToScene('forest')).not.toThrow();
    // 场景不存在时同样不抛错，只是静默不做任何事
    expect(() => handle.scrollToScene('not-a-scene')).not.toThrow();
  });

  it('格式工具栏按钮可以点击而不抛错（不依赖具体的选区状态断言）', async () => {
    render(
      <RichEditor
        content="# start\n\nhi"
        onChange={() => {}}
      />,
    );
    await waitForMount();

    const buttons = [
      '加粗 (Ctrl+B)',
      '斜体 (Ctrl+I)',
      '删除线',
      '行内代码',
      '标题 1',
      '标题 2',
      '标题 3',
      '无序列表',
      '有序列表',
      '引用',
      '分隔线',
    ];
    for (const title of buttons) {
      expect(() => screen.getByTitle(title).click()).not.toThrow();
    }
  });

  it('没有 gameId/variableNames 时使用默认空值，不影响挂载', async () => {
    render(
      <RichEditor
        content="# start\n\nhi"
        onChange={() => {}}
      />,
    );

    await waitForMount();

    expect(document.querySelector('.ProseMirror')).toBeTruthy();
  });
});
