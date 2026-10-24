'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Edge,
  MiniMap,
  useOnSelectionChange,
  Node,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { parse, stringify } from '@roudanio/parser';
import { WEBMCP_TOOLS } from '@mui-gamebook/webmcp';
import { hasSubstantialScript } from '@/lib/editor/generate-script';
import { gameToFlow, flowToGame, SceneNodeData } from '@/lib/editor/transformers';
import { useEditorData } from '@/lib/editor/useEditorData';
import { useFlowNodeHandlers } from '@/lib/editor/useFlowNodeHandlers';
import { useWebMcpTools } from '@/lib/editor/useWebMcpTools';
import { useEditorStore } from '@/lib/editor/store';
import SceneNode from '@/components/editor/SceneNode';
import Inspector from '@/components/editor/Inspector';
import EditorSettingsTab from '@/components/editor/EditorSettingsTab';
import EditorToolbar from '@/components/editor/EditorToolbar';
import EditorLeftSidebar from '@/components/editor/EditorLeftSidebar';
import StoryImporter from '@/components/editor/StoryImporter';
import ChatPanel from '@/components/editor/ChatPanel';
import RichEditor, { type RichEditorHandle } from '@/components/editor/RichEditor';
import { useDialog } from '@/components/Dialog';
import { useUnsavedChangesWarning, useUndoRedoShortcuts } from '@/hooks/useUndoRedo';
import { useAutoSave, type SaveStatus } from '@/hooks/useAutoSave';
import { updateScriptMetadata } from '@/lib/editor/script-metadata';
import { splitFrontmatter } from '@/lib/editor/dsl-tools/markdown';

const nodeTypes = { scene: SceneNode };

export default function VisualEditor({ id, previewUrl }: { id: string; previewUrl?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending: isAuthPending } = authClient.useSession();
  const { screenToFlowPosition, fitView } = useReactFlow();
  const dialog = useDialog();

  useUnsavedChangesWarning();
  useUndoRedoShortcuts();

  useEffect(() => {
    if (!isAuthPending && !session) {
      router.push('/sign-in');
    }
  }, [isAuthPending, session, router]);

  // Store UI 状态
  const activeTab = useEditorStore((s) => s.activeTab);
  const setViewMode = useEditorStore((s) => s.setViewMode);
  const chatOpen = useEditorStore((s) => s.chatOpen);
  const setChatOpen = useEditorStore((s) => s.setChatOpen);
  const leftSidebarOpen = useEditorStore((s) => s.leftSidebarOpen);
  const toggleLeftSidebar = useEditorStore((s) => s.toggleLeftSidebar);
  const showImporter = useEditorStore((s) => s.showImporter);
  const setShowImporter = useEditorStore((s) => s.setShowImporter);
  const selectedNode = useEditorStore((s) => s.selectedNode);
  const setSelectedNode = useEditorStore((s) => s.setSelectedNode);
  const selectedEdge = useEditorStore((s) => s.selectedEdge);
  const setSelectedEdge = useEditorStore((s) => s.setSelectedEdge);

  // React Flow 状态
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const [sceneIds, setSceneIds] = useState<string[]>([]);
  const [editorHandle, setEditorHandle] = useState<RichEditorHandle | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');

  const {
    originalGame,
    setOriginalGame,
    slug,
    setSlug,
    textContent,
    setTextContent,
    loading,
    saving,
    error,
    handleSave: saveGame,
    cloudSave,
    handleScriptImport,
    initialFlow,
    scanAndRegisterPendingOperations,
  } = useEditorData({ id, setNodes }) as ReturnType<typeof useEditorData> & {
    scanAndRegisterPendingOperations: (nodes: Node[]) => void;
  };

  // 自动保存
  useAutoSave({
    gameId: id,
    content: textContent,
    slug,
    ready: !loading && !!originalGame,
    onCloudSave: cloudSave,
    onStatusChange: setSaveStatus,
  });

  // 初始化节点和边
  useEffect(() => {
    if (initialFlow) {
      setNodes(initialFlow.nodes);
      setEdges(initialFlow.edges);
    }
  }, [initialFlow, setNodes, setEdges]);

  useEffect(() => {
    scanAndRegisterPendingOperations(nodes);
  }, [nodes, scanAndRegisterPendingOperations]);

  useEffect(() => {
    if (activeTab !== 'story' || !textContent.includes('pending://')) return;
    const parsed = parse(textContent);
    if (parsed.success) scanAndRegisterPendingOperations(gameToFlow(parsed.data).nodes);
  }, [activeTab, textContent, scanAndRegisterPendingOperations]);

  useEffect(() => {
    if (!loading && searchParams.get('showImporter') === 'true') {
      setShowImporter(true);
      router.replace(`/my/edit/${id}`);
    }
  }, [loading, searchParams, router, id, setShowImporter]);

  // 仅流程图修改反向生成 DSL；故事、AI 和素材回填直接更新文本。
  const originalGameRef = useRef(originalGame);
  originalGameRef.current = originalGame;
  // 切换视图时先从文本更新画布，避免旧画布覆盖最新正文。
  useEffect(() => {
    const game = originalGameRef.current;
    if (activeTab === 'flowchart' && game && nodes.length > 0) {
      const newGame = flowToGame(nodes as Node<SceneNodeData>[], edges, game);
      setTextContent(stringify(newGame));
    }
  }, [nodes, edges, setTextContent]);

  // flowchart 的 nodes/edges 是唯一源；侧栏改变量/角色时也要刷新 textContent（autosave 与切换 tab）。
  // 同理不依赖 activeTab，避免切换 tab 时抢先执行。
  useEffect(() => {
    if (activeTab !== 'flowchart' || !originalGame || nodes.length === 0) return;
    const newGame = flowToGame(nodes as Node<SceneNodeData>[], edges, originalGame);
    setTextContent(stringify(newGame));
  }, [originalGame, setTextContent]);

  // chatbot / in-page Agent 的上下文以当前编辑视图为准：
  // story tab 用用户正在编辑的文本，流程图/设置用画布派生的 DSL，避免读到旧内容
  const currentDsl = useMemo(() => {
    if (activeTab === 'story') return textContent;
    if (!originalGame || nodes.length === 0) return textContent;
    return stringify(flowToGame(nodes as Node<SceneNodeData>[], edges, originalGame));
  }, [activeTab, textContent, originalGame, nodes, edges]);

  useOnSelectionChange({
    onChange: ({ nodes, edges }) => {
      setSelectedNode(nodes[0] || null);
      setSelectedEdge(edges[0] || null);
    },
  });

  // 切换到流程图 tab 时，同步 textContent → nodes/edges
  useEffect(() => {
    if (activeTab === 'flowchart' && textContent && originalGame) {
      const result = parse(textContent);
      if (result.success) {
        setOriginalGame((prev) => ({ ...result.data, ...prev, scenes: result.data.scenes }));
        const flow = gameToFlow(result.data);
        setNodes(flow.nodes);
        setEdges(flow.edges);
        setViewMode('visual');
      }
    } else if (activeTab === 'story') {
      setViewMode('text');
    }
  }, [activeTab]);

  async function handleSave() {
    // 流程图模式下，viewMode 是 visual；故事模式下是 text
    const viewMode = activeTab === 'flowchart' ? 'visual' : 'text';
    const saved = await saveGame(nodes, edges, viewMode, activeTab);
    setSaveStatus(saved ? 'saved' : 'unsaved');
  }

  function handleStoryChange(content: string) {
    setTextContent(content);
    if (splitFrontmatter(content).frontmatter === splitFrontmatter(textContent).frontmatter) return;
    const parsed = parse(content);
    if (parsed.success) setOriginalGame((previous) => (previous ? { ...previous, ...parsed.data } : parsed.data));
  }

  function handleSidebarChange(updater: (game: NonNullable<typeof originalGame>) => NonNullable<typeof originalGame>) {
    if (!originalGame) return;
    const game = updater(originalGame);
    setOriginalGame(game);
    if (activeTab === 'story') setTextContent((current) => updateScriptMetadata(current, game));
  }

  async function handleImport(script: string) {
    await handleScriptImport(
      script,
      (newNodes) => setNodes(newNodes),
      (newEdges) => setEdges(newEdges),
      'text',
      setViewMode,
    );
  }

  const {
    onConnect,
    handleNodeChange,
    handleNodeIdChange,
    handleEdgeChange,
    handleAddScene,
    handleLayout,
    handleFunctionCall,
  } = useFlowNodeHandlers({
    nodes,
    edges,
    setNodes,
    setEdges,
    selectedNode,
    setSelectedNode,
    selectedEdge,
    setSelectedEdge,
    originalGame,
    setOriginalGame,
    activeTab,
    textContent,
    setTextContent,
    screenToFlowPosition,
    fitView,
    dialog,
  });

  // 编辑器页 in-page WebMCP：浏览器 AI 可直接调用读写工具（写操作走同一工作副本执行链路）
  useWebMcpTools({
    tools: WEBMCP_TOOLS,
    execute: (name, args) => {
      const result = handleFunctionCall([{ name, args }]);
      return JSON.stringify({
        ok: result.ok,
        changed: result.changed,
        results: result.results,
        ...(result.error ? { error: result.error } : {}),
      });
    },
  });

  if (isAuthPending || loading) return <div className="p-8 text-center">加载中...</div>;
  if (!session) {
    return null;
  }
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;

  // ChatPanel 渲染（所有非 settings tab 共用）
  const chatPanel = chatOpen && originalGame && (
    <div>
      <ChatPanel
        gameId={id}
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        dsl={currentDsl}
        story={originalGame.backgroundStory}
        characters={originalGame.ai?.characters}
        variables={originalGame.initialState as Record<string, unknown>}
        onFunctionCall={handleFunctionCall}
      />
    </div>
  );

  return (
    <div
      className="grow bg-gray-50 game-editor"
      data-editor-tab={activeTab}>
      <EditorToolbar
        title={originalGame?.title || originalGame?.slug}
        slug={slug}
        saving={saving}
        saveStatus={saveStatus}
        previewUrl={previewUrl}
        onAddScene={handleAddScene}
        onLayout={handleLayout}
        onSave={handleSave}
        leftSidebarOpen={leftSidebarOpen}
        onToggleLeftSidebar={toggleLeftSidebar}
      />

      {/* 设置 tab */}
      {activeTab === 'settings' && originalGame && (
        <div className="grow overflow-y-auto bg-gray-50 p-6">
          <EditorSettingsTab
            content={textContent}
            game={originalGame}
            id={id}
            onChange={setOriginalGame}
            onSlugChange={setSlug}
            slug={slug}
          />
        </div>
      )}

      {/* 故事 tab: 左侧栏 + TipTap 编辑器 + AI 助手 */}
      {activeTab === 'story' && (
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="min-h-0 shrink-0">
            {leftSidebarOpen && originalGame && (
              <EditorLeftSidebar
                game={originalGame}
                gameId={id}
                onGameChange={handleSidebarChange}
                sceneIds={sceneIds}
                onScrollToScene={(sceneId) => editorHandle?.scrollToScene(sceneId)}
              />
            )}
          </div>
          <div className="min-h-0 min-w-0 flex-1 flex flex-col overflow-hidden">
            <div className="min-h-0 flex-1 p-4 overflow-hidden">
              <RichEditor
                content={textContent}
                onChange={handleStoryChange}
                placeholder="开始写你的故事..."
                gameId={id}
                variableNames={originalGame ? Object.keys(originalGame.initialState) : []}
                characters={originalGame?.ai.characters}
                onScenesChange={setSceneIds}
                onEditorReady={setEditorHandle}
              />
            </div>
          </div>
          {chatPanel}
        </div>
      )}

      {/* 流程图 tab: 左侧栏 + React Flow + Inspector + AI 助手 */}
      {activeTab === 'flowchart' && (
        <div className="flex grow overflow-hidden">
          {leftSidebarOpen && originalGame && (
            <EditorLeftSidebar
              game={originalGame}
              gameId={id}
              onGameChange={(updater) => setOriginalGame((prev) => (prev ? updater(prev) : prev))}
            />
          )}
          <div className="flex-1 relative">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              fitView>
              <Background />
              <Controls />
              <MiniMap />
            </ReactFlow>
          </div>
          <Inspector
            aiConfig={originalGame?.ai}
            initialState={originalGame?.initialState}
            onNodeChange={handleNodeChange}
            onNodeIdChange={handleNodeIdChange}
            onEdgeChange={handleEdgeChange}
          />
          {chatPanel}
        </div>
      )}

      {showImporter && (
        <StoryImporter
          id={id}
          initialStory={originalGame?.storyPrompt}
          existingScript={hasSubstantialScript(originalGame) ? textContent : undefined}
          onImport={handleImport}
          onClose={() => setShowImporter(false)}
          onSaveStory={async (story) => {
            try {
              await fetch(`/api/cms/games/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: textContent, slug, storyPrompt: story }),
              });
              setOriginalGame((prev) => (prev ? { ...prev, storyPrompt: story } : prev));
            } catch (e) {
              console.error('Failed to save story prompt:', e);
            }
          }}
        />
      )}
    </div>
  );
}
