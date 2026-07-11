import '@testing-library/jest-dom';
import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import AssetEditor from '@/components/editor/AssetEditor';
import type { EditorSceneAsset } from '@/lib/editor/transformers';

vi.mock('@/components/Dialog', () => ({
  useDialog: () => ({ error: vi.fn(), alert: vi.fn(), confirm: vi.fn() }),
}));

vi.mock('@/hooks/useCmsConfig', () => ({
  useCmsConfig: () => ({ data: { defaultAiProvider: 'google' } }),
  getAspectRatios: () => [{ value: '1:1', label: '1:1' }],
}));

const INITIAL_ASSETS: EditorSceneAsset[] = [
  { editorId: 'asset-a', asset: { type: 'ai_image', prompt: '' } },
  { editorId: 'asset-b', asset: { type: 'ai_image', prompt: '' } },
];

function AssetEditorHarness() {
  const [assets, setAssets] = useState(INITIAL_ASSETS);
  return (
    <AssetEditor
      gameId="game-1"
      assets={assets}
      onAssetsChange={setAssets}
    />
  );
}

function SceneSwitchHarness() {
  const [sceneId, setSceneId] = useState<'first' | 'second'>('first');
  const [sceneAssets, setSceneAssets] = useState<Record<'first' | 'second', EditorSceneAsset[]>>({
    first: [{ editorId: 'first-asset', asset: { type: 'ai_image', prompt: '' } }],
    second: [{ editorId: 'second-asset', asset: { type: 'ai_image', prompt: '' } }],
  });

  function handleAssetsChange(assets: EditorSceneAsset[]) {
    setSceneAssets((current) => ({ ...current, [sceneId]: assets }));
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setSceneId((current) => (current === 'first' ? 'second' : 'first'))}>
        切换场景
      </button>
      <AssetEditor
        gameId="game-1"
        assets={sceneAssets[sceneId]}
        onAssetsChange={handleAssetsChange}
      />
    </>
  );
}

function renderEditor() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AssetEditorHarness />
    </QueryClientProvider>,
  );
}

function renderSceneSwitchEditor() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <SceneSwitchHarness />
    </QueryClientProvider>,
  );
}

describe('AssetEditor', () => {
  it('删除前项后应该保留后一项的组件 identity、展开状态和焦点', () => {
    renderEditor();

    fireEvent.click(screen.getAllByTitle('AI 生成素材')[1]);
    const textarea = screen.getByPlaceholderText('输入 AI 生成提示词...');
    textarea.focus();

    fireEvent.click(screen.getAllByTitle('删除素材')[0]);

    expect(screen.getByPlaceholderText('输入 AI 生成提示词...')).toBe(textarea);
    expect(document.activeElement).toBe(textarea);
    expect(screen.getAllByTitle('AI 生成素材')).toHaveLength(1);
  });

  it('新增素材时不应该重挂载已有的展开表单', () => {
    renderEditor();

    fireEvent.click(screen.getAllByTitle('AI 生成素材')[1]);
    const textarea = screen.getByPlaceholderText('输入 AI 生成提示词...');
    fireEvent.click(screen.getByTitle('添加音频'));

    expect(screen.getByPlaceholderText('输入 AI 生成提示词...')).toBe(textarea);
    expect(screen.getAllByTitle('AI 生成素材')).toHaveLength(3);
  });

  it('切换场景时不应该把上一场景的展开状态串到同位置素材', () => {
    renderSceneSwitchEditor();

    fireEvent.click(screen.getByTitle('AI 生成素材'));
    expect(screen.getByPlaceholderText('输入 AI 生成提示词...')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '切换场景' }));

    expect(screen.queryByPlaceholderText('输入 AI 生成提示词...')).not.toBeInTheDocument();
  });
});
