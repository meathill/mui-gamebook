import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'game-1' }),
}));

const dialog = { alert: vi.fn(), confirm: vi.fn(), success: vi.fn(), error: vi.fn() };
vi.mock('@/components/Dialog', () => ({
  useDialog: () => dialog,
}));

vi.mock('@/components/editor/AssetEditor', () => ({
  default: (props: { assets: unknown[] }) => (
    <div
      data-testid="asset-editor"
      data-count={props.assets.length}
    />
  ),
}));

vi.mock('@/components/editor/CharacterMentionTextarea', () => ({
  default: (props: { value: string; onChange: (v: string) => void }) => (
    <textarea
      data-testid="content-textarea"
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
    />
  ),
}));

import Inspector from '@/components/editor/Inspector';
import { useEditorStore } from '@/lib/editor/store';

const noopProps = { onNodeChange: vi.fn(), onNodeIdChange: vi.fn(), onEdgeChange: vi.fn() };

function selectNode(overrides: Record<string, unknown> = {}) {
  useEditorStore.setState({
    selectedNode: {
      id: 'start',
      position: { x: 0, y: 0 },
      data: { label: 'start', content: '开始场景', assets: [], ...overrides },
    },
    selectedEdge: null,
  });
}

function selectEdge(overrides: Record<string, unknown> = {}) {
  useEditorStore.setState({
    selectedNode: null,
    selectedEdge: { id: 'e1', source: 'start', target: 'forest', label: '进入森林', data: {}, ...overrides },
  });
}

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: () => Promise.resolve(body) } as Response;
}

describe('Inspector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useEditorStore.setState({ selectedNode: null, selectedEdge: null });
  });

  it('没有选中任何节点/边时显示占位提示', () => {
    render(<Inspector {...noopProps} />);

    expect(screen.getByText('选择一个节点或边来编辑属性。')).toBeInTheDocument();
  });

  describe('选中节点', () => {
    it('显示场景标签和内容，透传给 AssetEditor', () => {
      selectNode({ assets: [{ editorId: '1', asset: { type: 'ai_image', prompt: 'x' } }] });

      render(<Inspector {...noopProps} />);

      expect(screen.getByText('场景：start')).toBeInTheDocument();
      expect(screen.getByTestId('content-textarea')).toHaveValue('开始场景');
      expect(screen.getByTestId('asset-editor').dataset.count).toBe('1');
    });

    it('场景 ID 输入框失焦时调用 onNodeIdChange', () => {
      selectNode();
      const onNodeIdChange = vi.fn();
      render(
        <Inspector
          {...noopProps}
          onNodeIdChange={onNodeIdChange}
        />,
      );

      const input = screen.getByDisplayValue('start');
      fireEvent.change(input, { target: { value: 'intro' } });
      fireEvent.blur(input);

      expect(onNodeIdChange).toHaveBeenCalledWith('start', 'intro');
    });

    it('修改内容时调用 onNodeChange', () => {
      selectNode();
      const onNodeChange = vi.fn();
      render(
        <Inspector
          {...noopProps}
          onNodeChange={onNodeChange}
        />,
      );

      fireEvent.change(screen.getByTestId('content-textarea'), { target: { value: '新内容' } });

      expect(onNodeChange).toHaveBeenCalledWith('start', { content: '新内容' });
    });

    it('没有内容时不显示生成语音按钮', () => {
      selectNode({ content: '' });

      render(<Inspector {...noopProps} />);

      expect(screen.queryByTitle('为内容生成语音')).not.toBeInTheDocument();
    });

    describe('生成语音（节点内容）', () => {
      it('成功后把 audio_url 写回节点，并提示成功', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ url: 'https://cdn.x.com/a.wav' })));
        selectNode();
        const onNodeChange = vi.fn();
        render(
          <Inspector
            {...noopProps}
            onNodeChange={onNodeChange}
          />,
        );

        fireEvent.click(screen.getByTitle('为内容生成语音'));

        await waitFor(() =>
          expect(onNodeChange).toHaveBeenCalledWith('start', { audio_url: 'https://cdn.x.com/a.wav' }),
        );
        expect(dialog.alert).toHaveBeenCalledWith('语音生成成功！');
        vi.unstubAllGlobals();
      });

      it('请求失败时弹出错误提示，不写回 audio_url', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ error: '生成失败' }, false)));
        selectNode();
        const onNodeChange = vi.fn();
        render(
          <Inspector
            {...noopProps}
            onNodeChange={onNodeChange}
          />,
        );

        fireEvent.click(screen.getByTitle('为内容生成语音'));

        await waitFor(() => expect(dialog.error).toHaveBeenCalledWith('TTS 生成失败：生成失败'));
        expect(onNodeChange).not.toHaveBeenCalled();
        vi.unstubAllGlobals();
      });
    });
  });

  describe('选中边', () => {
    it('显示选项文本、条件、状态更新三个字段', () => {
      selectEdge({ data: { condition: 'has_key', set: 'gold=100' } });

      render(<Inspector {...noopProps} />);

      expect(screen.getByText('选项：进入森林')).toBeInTheDocument();
      expect(screen.getByDisplayValue('进入森林')).toBeInTheDocument();
      expect(screen.getByDisplayValue('has_key')).toBeInTheDocument();
      expect(screen.getByDisplayValue('gold=100')).toBeInTheDocument();
    });

    it('修改选项文本时调用 onEdgeChange', () => {
      selectEdge();
      const onEdgeChange = vi.fn();
      render(
        <Inspector
          {...noopProps}
          onEdgeChange={onEdgeChange}
        />,
      );

      fireEvent.change(screen.getByDisplayValue('进入森林'), { target: { value: '返回' } });

      expect(onEdgeChange).toHaveBeenCalledWith('e1', { label: '返回' });
    });

    it('修改条件时保留其余 data 字段', () => {
      selectEdge({ data: { set: 'gold=100' } });
      const onEdgeChange = vi.fn();
      render(
        <Inspector
          {...noopProps}
          onEdgeChange={onEdgeChange}
        />,
      );

      fireEvent.change(screen.getByPlaceholderText('例如: has_key == true'), { target: { value: 'has_key' } });

      expect(onEdgeChange).toHaveBeenCalledWith('e1', { data: { set: 'gold=100', condition: 'has_key' } });
    });

    it('生成语音成功后把 audio_url 写入 edge.data', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ url: 'https://cdn.x.com/e.wav' })));
      selectEdge();
      const onEdgeChange = vi.fn();
      render(
        <Inspector
          {...noopProps}
          onEdgeChange={onEdgeChange}
        />,
      );

      fireEvent.click(screen.getByTitle('为选项生成语音'));

      await waitFor(() =>
        expect(onEdgeChange).toHaveBeenCalledWith('e1', { data: { audio_url: 'https://cdn.x.com/e.wav' } }),
      );
      vi.unstubAllGlobals();
    });
  });
});
