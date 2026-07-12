import { ReactFlowProvider } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SceneNode from '@/components/editor/SceneNode';

function renderNode(data: Record<string, unknown>) {
  const props = {
    id: 'start',
    data,
    type: 'scene',
    dragging: false,
    zIndex: 0,
    isConnectable: true,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
    selected: false,
    selectable: true,
    deletable: true,
    draggable: true,
  } as unknown as NodeProps;

  return render(
    <ReactFlowProvider>
      <SceneNode {...props} />
    </ReactFlowProvider>,
  );
}

describe('SceneNode', () => {
  it('显示场景标签和内容', () => {
    renderNode({ label: 'start', content: '开始场景的文案', assets: [] });

    expect(screen.getByText('start')).toBeInTheDocument();
    expect(screen.getByText('开始场景的文案')).toBeInTheDocument();
  });

  it('没有内容时显示占位文案', () => {
    renderNode({ label: 'start', content: '', assets: [] });

    expect(screen.getByText('暂无内容')).toBeInTheDocument();
  });

  it('没有图片素材时不渲染图片', () => {
    renderNode({ label: 'start', content: 'x', assets: [] });

    expect(document.querySelector('img')).not.toBeInTheDocument();
  });

  it('有 ai_image 素材时渲染第一张图片', () => {
    renderNode({
      label: 'start',
      content: 'x',
      assets: [{ editorId: '1', asset: { type: 'ai_image', url: 'https://x.com/a.png', prompt: 'x' } }],
    });

    expect(document.querySelector('img')).toHaveAttribute('src', 'https://x.com/a.png');
  });

  it('有多个素材时只取第一个图片类型的', () => {
    renderNode({
      label: 'start',
      content: 'x',
      assets: [
        { editorId: '1', asset: { type: 'audio', url: 'https://x.com/a.wav' } },
        { editorId: '2', asset: { type: 'static_image', url: 'https://x.com/b.png' } },
      ],
    });

    expect(document.querySelector('img')).toHaveAttribute('src', 'https://x.com/b.png');
  });
});
