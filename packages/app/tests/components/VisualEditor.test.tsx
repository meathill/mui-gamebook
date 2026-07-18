import { ReactFlowProvider } from '@xyflow/react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const push = vi.fn();
const replace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/lib/auth-client', () => ({
  authClient: { useSession: vi.fn() },
}));

vi.mock('@/lib/editor/useEditorData', () => ({
  useEditorData: vi.fn(),
}));

vi.mock('@/hooks/useAutoSave', () => ({
  useAutoSave: vi.fn(),
}));

vi.mock('@/hooks/useUndoRedo', () => ({
  useUnsavedChangesWarning: vi.fn(),
  useUndoRedoShortcuts: vi.fn(),
}));

vi.mock('@/components/Dialog', () => ({
  useDialog: () => ({ alert: vi.fn(), confirm: vi.fn(), success: vi.fn(), error: vi.fn() }),
}));

vi.mock('@/components/editor/SceneNode', () => ({ default: () => null }));
vi.mock('@/components/editor/Inspector', () => ({ default: () => <div data-testid="inspector" /> }));
vi.mock('@/components/editor/EditorSettingsTab', () => ({
  default: () => <div data-testid="settings-tab" />,
}));
vi.mock('@/components/editor/EditorToolbar', () => ({
  default: (props: { title?: string; saveStatus?: string }) => (
    <div
      data-testid="toolbar"
      data-title={props.title}
      data-save-status={props.saveStatus}
    />
  ),
}));
vi.mock('@/components/editor/EditorLeftSidebar', () => ({
  default: () => <div data-testid="left-sidebar" />,
}));
vi.mock('@/components/editor/StoryImporter', () => ({
  default: (props: { existingScript?: string }) => (
    <div
      data-testid="story-importer"
      data-existing-script={props.existingScript ?? ''}
    />
  ),
}));
vi.mock('@/components/editor/ChatPanel', () => ({ default: () => <div data-testid="chat-panel" /> }));
vi.mock('@/components/editor/RichEditor', () => ({
  default: () => <div data-testid="rich-editor" />,
}));

import { useEditorStore } from '@/lib/editor/store';
import { authClient } from '@/lib/auth-client';
import { useEditorData } from '@/lib/editor/useEditorData';
import VisualEditor from '@/components/editor/VisualEditor';

function makeEditorData(overrides: Record<string, unknown> = {}) {
  return {
    originalGame: { title: '测试游戏', slug: 'test-game', ai: { characters: {} }, initialState: {} },
    setOriginalGame: vi.fn(),
    slug: 'test-game',
    setSlug: vi.fn(),
    textContent: '# start\nhi',
    setTextContent: vi.fn(),
    loading: false,
    saving: false,
    error: null,
    handleSave: vi.fn().mockResolvedValue(undefined),
    cloudSave: vi.fn(),
    handleGenerateAssets: vi.fn(),
    handleScriptImport: vi.fn(),
    initialFlow: null,
    scanAndRegisterPendingOperations: vi.fn(),
    ...overrides,
  };
}

function renderVisualEditor(id = 'game-1') {
  return render(
    <ReactFlowProvider>
      <VisualEditor id={id} />
    </ReactFlowProvider>,
  );
}

describe('VisualEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useEditorStore.setState({
      activeTab: 'story',
      chatOpen: false,
      leftSidebarOpen: true,
      showImporter: false,
      selectedNode: null,
      selectedEdge: null,
    });
    (authClient.useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { user: { id: 'u1' } },
      isPending: false,
    });
    (useEditorData as ReturnType<typeof vi.fn>).mockReturnValue(makeEditorData());
  });

  it('未登录且鉴权状态确定后跳转到登录页', async () => {
    (authClient.useSession as ReturnType<typeof vi.fn>).mockReturnValue({ data: null, isPending: false });

    renderVisualEditor();

    await waitFor(() => expect(push).toHaveBeenCalledWith('/sign-in'));
  });

  it('鉴权状态未知时不跳转，显示加载中', () => {
    (authClient.useSession as ReturnType<typeof vi.fn>).mockReturnValue({ data: null, isPending: true });

    renderVisualEditor();

    expect(screen.getByText('加载中...')).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('数据加载中时显示加载态，不渲染工具栏', () => {
    (useEditorData as ReturnType<typeof vi.fn>).mockReturnValue(makeEditorData({ loading: true }));

    renderVisualEditor();

    expect(screen.getByText('加载中...')).toBeInTheDocument();
    expect(screen.queryByTestId('toolbar')).not.toBeInTheDocument();
  });

  it('加载出错时显示错误信息', () => {
    (useEditorData as ReturnType<typeof vi.fn>).mockReturnValue(makeEditorData({ error: '游戏不存在' }));

    renderVisualEditor();

    expect(screen.getByText('游戏不存在')).toBeInTheDocument();
  });

  it('story tab：渲染左侧栏 + RichEditor，不渲染流程图', () => {
    renderVisualEditor();

    expect(screen.getByTestId('rich-editor')).toBeInTheDocument();
    expect(screen.getByTestId('left-sidebar')).toBeInTheDocument();
    expect(screen.queryByTestId('inspector')).not.toBeInTheDocument();
  });

  it('flowchart tab：渲染 ReactFlow + Inspector，不渲染 RichEditor', () => {
    useEditorStore.setState({ activeTab: 'flowchart' });

    renderVisualEditor();

    expect(screen.getByTestId('inspector')).toBeInTheDocument();
    expect(screen.queryByTestId('rich-editor')).not.toBeInTheDocument();
  });

  it('settings tab：渲染 EditorSettingsTab', () => {
    useEditorStore.setState({ activeTab: 'settings' });

    renderVisualEditor();

    expect(screen.getByTestId('settings-tab')).toBeInTheDocument();
    expect(screen.queryByTestId('rich-editor')).not.toBeInTheDocument();
  });

  it('工具栏拿到当前游戏标题和保存状态', () => {
    renderVisualEditor();

    const toolbar = screen.getByTestId('toolbar');
    expect(toolbar.dataset.title).toBe('测试游戏');
    expect(toolbar.dataset.saveStatus).toBe('saved');
  });

  it('showImporter 为 true 时渲染 StoryImporter', () => {
    useEditorStore.setState({ showImporter: true });

    renderVisualEditor();

    expect(screen.getByTestId('story-importer')).toBeInTheDocument();
  });

  it('新建游戏（空白模板，无场景/角色/变量）时 StoryImporter 拿不到 existingScript', () => {
    useEditorStore.setState({ showImporter: true });

    renderVisualEditor();

    expect(screen.getByTestId('story-importer').dataset.existingScript).toBe('');
  });

  it('已有实质性剧本内容（多场景）时 StoryImporter 拿到 existingScript', () => {
    useEditorStore.setState({ showImporter: true });
    (useEditorData as ReturnType<typeof vi.fn>).mockReturnValue(
      makeEditorData({
        originalGame: {
          title: '测试游戏',
          slug: 'test-game',
          scenes: { start: {}, next: {} },
          ai: { characters: {} },
          initialState: {},
        },
        textContent: '# start\n真实剧本内容',
      }),
    );

    renderVisualEditor();

    expect(screen.getByTestId('story-importer').dataset.existingScript).toBe('# start\n真实剧本内容');
  });

  it('已有实质性剧本内容（有角色）时 StoryImporter 拿到 existingScript', () => {
    useEditorStore.setState({ showImporter: true });
    (useEditorData as ReturnType<typeof vi.fn>).mockReturnValue(
      makeEditorData({
        originalGame: {
          title: '测试游戏',
          slug: 'test-game',
          scenes: { start: {} },
          ai: { characters: { hero: { name: '英雄' } } },
          initialState: {},
        },
        textContent: '# start\n真实剧本内容',
      }),
    );

    renderVisualEditor();

    expect(screen.getByTestId('story-importer').dataset.existingScript).toBe('# start\n真实剧本内容');
  });

  it('chatOpen 且游戏已加载时渲染 ChatPanel（story/flowchart tab 共用）', () => {
    useEditorStore.setState({ chatOpen: true });

    renderVisualEditor();

    expect(screen.getByTestId('chat-panel')).toBeInTheDocument();
  });
});
