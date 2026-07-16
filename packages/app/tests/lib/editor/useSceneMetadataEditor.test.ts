import { act, renderHook } from '@testing-library/react';
import type { NodeViewProps } from '@tiptap/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useSceneMetadataEditor } from '@/lib/editor/useSceneMetadataEditor';

// 沿用 SceneMetadataBlock.test.tsx 已验证过的 tiptap NodeViewProps 最小 stub 方式：
// editor/node/getPos 都不需要真正的 tiptap 实例，普通对象即可。
function createNodeViewProps(yaml: string) {
  const replaceWith = vi.fn();
  const text = vi.fn((s: string) => s);
  const dispatch = vi.fn();
  const props = {
    node: { attrs: { language: 'yaml' }, textContent: yaml, nodeSize: yaml.length + 2 },
    editor: { view: { state: { tr: { replaceWith }, schema: { text } }, dispatch } },
    getPos: () => 0,
  } as unknown as Pick<NodeViewProps, 'node' | 'editor' | 'getPos'>;
  return { props, replaceWith, dispatch };
}

function renderEditor(yaml: string, gameId: string | undefined = 'game-1') {
  const { props, replaceWith, dispatch } = createNodeViewProps(yaml);
  const hook = renderHook(() => useSceneMetadataEditor({ ...props, gameId }));
  return { hook, replaceWith, dispatch };
}

describe('useSceneMetadataEditor', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('解析出 metadata 和 hasContent', () => {
    const { hook } = renderEditor('image:\n  prompt: 奶奶给的平安符');

    expect(hook.result.current.metadata.image).toEqual({ prompt: '奶奶给的平安符' });
    expect(hook.result.current.hasContent).toBe(true);
  });

  it('没有任何字段时 hasContent 为 false', () => {
    const { hook } = renderEditor('');

    expect(hook.result.current.hasContent).toBe(false);
  });

  describe('startEdit', () => {
    it('image 分区：把已有字段填入 editForm', () => {
      const { hook } = renderEditor('image:\n  prompt: 旧描述\n  url: https://x.com/a.png');

      act(() => hook.result.current.startEdit('image'));

      expect(hook.result.current.editingSection).toBe('image');
      expect(hook.result.current.editForm).toEqual({ prompt: '旧描述', url: 'https://x.com/a.png' });
    });

    it('characters 分区：数组用逗号拼接成字符串', () => {
      const { hook } = renderEditor('characters:\n  - hero\n  - villain');

      act(() => hook.result.current.startEdit('characters'));

      expect(hook.result.current.editForm).toEqual({ characters: 'hero, villain' });
    });
  });

  describe('saveEdit', () => {
    it('editingSection 为空时不做任何事', () => {
      const { hook, dispatch } = renderEditor('');

      act(() => hook.result.current.saveEdit());

      expect(dispatch).not.toHaveBeenCalled();
    });

    it('characters：按逗号拆分并过滤空白项，写回文档后清空 editingSection', () => {
      const { hook, replaceWith, dispatch } = renderEditor('');

      act(() => hook.result.current.startEdit('characters'));
      act(() => hook.result.current.setField('characters', 'hero,  , villain ,'));
      act(() => hook.result.current.saveEdit());

      expect(replaceWith).toHaveBeenCalled();
      expect(dispatch).toHaveBeenCalled();
      expect(hook.result.current.editingSection).toBeNull();
      // 保存后重新解析文档内容会得到更新后的 metadata；这里直接断言序列化调用参数
      const serialized = (replaceWith.mock.calls[0] as unknown[])[2];
      expect(String(serialized)).toContain('hero');
      expect(String(serialized)).toContain('villain');
      expect(String(serialized)).not.toMatch(/,\s*,/);
    });

    it('image：从 editForm 组装 image 分区', () => {
      const { hook, replaceWith } = renderEditor('');

      act(() => hook.result.current.startEdit('image'));
      act(() => hook.result.current.setField('prompt', '新描述'));
      act(() => hook.result.current.setField('aspectRatio', '16:9'));
      act(() => hook.result.current.saveEdit());

      const serialized = String((replaceWith.mock.calls[0] as unknown[])[2]);
      expect(serialized).toContain('prompt: 新描述');
      // js-yaml 对含冒号的值加引号（旧手写 serialize 裸写会产出非法 yaml）
      expect(serialized).toContain("aspectRatio: '16:9'");
    });
  });

  describe('未知键透传（issue #7 回归）', () => {
    const initialYaml = `image:
  prompt: 旧描述
minigame:
  prompt: 小游戏
  variables:
    score: 分数
meta:
  chapter: 第一章`;

    it('编辑 image 保存后保留 minigame.variables 与自定义顶层键', () => {
      const { hook, replaceWith } = renderEditor(initialYaml);

      act(() => hook.result.current.startEdit('image'));
      act(() => hook.result.current.setField('prompt', '新描述'));
      act(() => hook.result.current.saveEdit());

      const serialized = String((replaceWith.mock.calls[0] as unknown[])[2]);
      expect(serialized).toContain('新描述');
      expect(serialized).not.toContain('旧描述');
      expect(serialized).toContain('score: 分数');
      expect(serialized).toContain('chapter: 第一章');
    });

    it('清空 url 后该键消失，未知键仍在', () => {
      const { hook, replaceWith } = renderEditor(`image:
  prompt: 描述
  url: https://x.com/a.png
meta:
  chapter: 1`);

      act(() => hook.result.current.startEdit('image'));
      act(() => hook.result.current.setField('url', ''));
      act(() => hook.result.current.saveEdit());

      const serialized = String((replaceWith.mock.calls[0] as unknown[])[2]);
      expect(serialized).not.toContain('https://x.com/a.png');
      expect(serialized).toContain('prompt: 描述');
      expect(serialized).toContain('chapter: 1');
    });

    it('addSection 不抹掉未知键', () => {
      const { hook, replaceWith } = renderEditor(`image:
  prompt: x
meta:
  chapter: 1`);

      act(() => hook.result.current.addSection('video'));

      const serialized = String((replaceWith.mock.calls[0] as unknown[])[2]);
      expect(serialized).toContain('video:');
      expect(serialized).toContain('prompt: x');
      expect(serialized).toContain('chapter: 1');
    });
  });

  it('addSection 写入一个空白 section', () => {
    const { hook, replaceWith, dispatch } = renderEditor('');

    act(() => hook.result.current.addSection('video'));

    expect(replaceWith).toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalled();
    const serialized = String((replaceWith.mock.calls[0] as unknown[])[2]);
    expect(serialized).toContain('video:');
  });

  it('setField 更新 editForm 中的单个字段', () => {
    const { hook } = renderEditor('');

    act(() => hook.result.current.setField('prompt', 'x'));

    expect(hook.result.current.editForm.prompt).toBe('x');
  });

  it('handleUploaded 把上传后的 url 写入 editForm', () => {
    const { hook } = renderEditor('');

    act(() => hook.result.current.handleUploaded('https://cdn.x.com/a.png'));

    expect(hook.result.current.editForm.url).toBe('https://cdn.x.com/a.png');
  });

  describe('handleGenerate', () => {
    it('没有 prompt 或 gameId 时不发请求', async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);
      const { hook } = renderEditor('', undefined);

      await act(async () => {
        await hook.result.current.handleGenerate();
      });

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('成功路径：请求 AI 生图并把 url 写回 editForm，generating 状态正确切换', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue({ ok: true, json: () => Promise.resolve({ url: 'https://x.com/g.png' }) });
      vi.stubGlobal('fetch', fetchMock);
      const { hook } = renderEditor('');

      act(() => hook.result.current.setField('prompt', '森林小屋'));

      const generatePromise = act(async () => {
        await hook.result.current.handleGenerate();
      });
      await generatePromise;

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/cms/assets/generate',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ prompt: '森林小屋', gameId: 'game-1', type: 'ai_image', aspectRatio: undefined }),
        }),
      );
      expect(hook.result.current.editForm.url).toBe('https://x.com/g.png');
      expect(hook.result.current.generating).toBe(false);
    });

    it('请求失败时吞掉错误，generating 恢复为 false，不写入 url', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue({ ok: false, status: 500, json: () => Promise.resolve({ error: '生成失败' }) });
      vi.stubGlobal('fetch', fetchMock);
      const { hook } = renderEditor('');

      act(() => hook.result.current.setField('prompt', '森林小屋'));
      await act(async () => {
        await hook.result.current.handleGenerate();
      });

      expect(hook.result.current.editForm.url).toBeUndefined();
      expect(hook.result.current.generating).toBe(false);
    });
  });
});
