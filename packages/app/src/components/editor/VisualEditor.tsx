'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  MiniMap,
  useOnSelectionChange,
  Node,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { parse, stringify } from '@mui-gamebook/parser';
import { gameToFlow, flowToGame, SceneNodeData } from '@/lib/editor/transformers';
import { getLayoutedElements } from '@/lib/editor/layout';
import { handleBatchFunctionCalls } from '@/lib/editor/chatFunctionHandlers';
import { useEditorData } from '@/lib/editor/useEditorData';
import { useEditorStore } from '@/lib/editor/store';
import SceneNode from '@/components/editor/SceneNode';
import Inspector from '@/components/editor/Inspector';
import EditorSettingsTab from '@/components/editor/EditorSettingsTab';
import EditorVariablesTab from '@/components/editor/EditorVariablesTab';
import EditorCharactersTab from '@/components/editor/EditorCharactersTab';
import EditorToolbar from '@/components/editor/EditorToolbar';
import StoryImporter from '@/components/editor/StoryImporter';
import ChatPanel from '@/components/editor/ChatPanel';
import { useDialog } from '@/components/Dialog';
import { useUnsavedChangesWarning, useUndoRedoShortcuts } from '@/hooks/useUndoRedo';
import type { GameState, AICharacter } from '@mui-gamebook/parser/src/types';

const nodeTypes = { scene: SceneNode };

export default function VisualEditor({ id }: { id: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending: isAuthPending } = authClient.useSession();
  const { screenToFlowPosition, fitView } = useReactFlow();
  const dialog = useDialog();

  // Undo/Redo 支持
  useUnsavedChangesWarning();
  useUndoRedoShortcuts();

  // 从 store 获取 UI 状态
  const activeTab = useEditorStore((s) => s.activeTab);
  const viewMode = useEditorStore((s) => s.viewMode);
  const setViewMode = useEditorStore((s) => s.setViewMode);
  const chatOpen = useEditorStore((s) => s.chatOpen);
  const setChatOpen = useEditorStore((s) => s.setChatOpen);
  const showImporter = useEditorStore((s) => s.showImporter);
  const setShowImporter = useEditorStore((s) => s.setShowImporter);
  const selectedNode = useEditorStore((s) => s.selectedNode);
  const setSelectedNode = useEditorStore((s) => s.setSelectedNode);
  const selectedEdge = useEditorStore((s) => s.selectedEdge);
  const setSelectedEdge = useEditorStore((s) => s.setSelectedEdge);

  // React Flow 状态（保留原有 hooks 以兼容 React Flow）
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [assetGenerating, setAssetGenerating] = useState(false);

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
    handleGenerateAssets: generateAssets,
    handleScriptImport,
    initialFlow,
    scanAndRegisterPendingOperations,
  } = useEditorData({ id, setNodes }) as ReturnType<typeof useEditorData> & {
    scanAndRegisterPendingOperations: (nodes: Node[]) => void;
  };
  // 初始化节点和边
  useEffect(() => {
    if (initialFlow) {
      setNodes(initialFlow.nodes);
      setEdges(initialFlow.edges);
    }
  }, [initialFlow, setNodes, setEdges]);

  // 当节点变化时，扫描并注册 pending 操作
  useEffect(() => {
    scanAndRegisterPendingOperations(nodes);
  }, [nodes, scanAndRegisterPendingOperations]);

  // 当加载完成后，检查 URL 参数决定是否自动打开导入器
  useEffect(() => {
    if (!loading && searchParams.get('showImporter') === 'true') {
      setShowImporter(true);
      router.replace(`/admin/edit/${id}`);
    }
  }, [loading, searchParams, router, id, setShowImporter]);

  // 当 nodes/edges 变化时，如果在文本编辑模式下，同步更新 textContent
  // 这确保 AI chatbot 更新 nodes 后，textContent 也会更新
  useEffect(() => {
    if (viewMode === 'text' && originalGame && nodes.length > 0) {
      const newGame = flowToGame(nodes as Node<SceneNodeData>[], edges, originalGame);
      const content = stringify(newGame);
      setTextContent(content);
    }
  }, [nodes, edges, viewMode, originalGame, setTextContent]);

  useOnSelectionChange({
    onChange: ({ nodes, edges }) => {
      setSelectedNode(nodes[0] || null);
      setSelectedEdge(edges[0] || null);
    },
  });

  async function toggleViewMode() {
    if (viewMode === 'visual') {
      if (originalGame) {
        const newGame = flowToGame(nodes as Node<SceneNodeData>[], edges, originalGame);
        const content = stringify(newGame);
        setTextContent(content);
      }
      setViewMode('text');
    } else {
      const result = parse(textContent);
      if (result.success) {
        setOriginalGame((prev) => ({ ...result.data, ...prev, scenes: result.data.scenes }));
        const flow = gameToFlow(result.data);
        setNodes(flow.nodes);
        setEdges(flow.edges);
        setViewMode('visual');
      } else {
        await dialog.error(`无法切换到可视化模式：Markdown 格式无效。\n\n${result.error}`);
      }
    }
  }

  async function handleSave() {
    await saveGame(nodes, edges, viewMode, activeTab);
  }

  async function handleGenerateAssets() {
    setAssetGenerating(true);
    await handleSave();
    await generateAssets();
    setAssetGenerating(false);
  }

  async function handleImport(script: string) {
    await handleScriptImport(
      script,
      (newNodes) => setNodes(newNodes),
      (newEdges) => setEdges(newEdges),
      viewMode,
      setViewMode,
    );
  }

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, type: 'default', label: 'Choice' }, eds)),
    [setEdges],
  );

  function handleNodeChange(nodeId: string, data: Partial<SceneNodeData>) {
    setNodes((nds) => nds.map((node) => (node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node)));
    if (selectedNode && selectedNode.id === nodeId) {
      setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, ...data } } as Node);
    }
  }

  async function handleNodeIdChange(oldId: string, newId: string) {
    if (!newId || oldId === newId) return;
    if (nodes.some((n) => n.id === newId)) {
      await dialog.alert(`场景 ID "${newId}" 已存在。`);
      return;
    }
    setNodes((nds) =>
      nds.map((node) => (node.id === oldId ? { ...node, id: newId, data: { ...node.data, label: newId } } : node)),
    );
    setEdges((eds) =>
      eds.map((edge) => {
        let u = false,
          s = edge.source,
          t = edge.target;
        if (s === oldId) {
          s = newId;
          u = true;
        }
        if (t === oldId) {
          t = newId;
          u = true;
        }
        return u ? { ...edge, source: s, target: t } : edge;
      }),
    );
  }

  function handleEdgeChange(edgeId: string, changes: { label?: string; data?: Record<string, unknown> }) {
    setEdges((eds) =>
      eds.map((edge) =>
        edge.id === edgeId
          ? {
              ...edge,
              ...(changes.label ? { label: changes.label } : {}),
              ...(changes.data ? { data: { ...edge.data, ...changes.data } } : {}),
            }
          : edge,
      ),
    );
    if (selectedEdge && selectedEdge.id === edgeId) {
      setSelectedEdge({
        ...selectedEdge,
        ...(changes.label ? { label: changes.label } : {}),
        ...(changes.data ? { data: { ...selectedEdge.data, ...changes.data } } : {}),
      } as Edge);
    }
  }

  function handleAddScene() {
    const sceneId = `scene_${Date.now().toString().slice(-4)}`;
    const newNode = {
      id: sceneId,
      position: screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 }),
      data: { label: sceneId, content: 'New scene content', assets: [] },
      type: 'scene',
    };
    setNodes((nds) => nds.concat(newNode));
  }

  const handleLayout = useCallback(() => {
    const { nodes: ln, edges: le } = getLayoutedElements(nodes, edges);
    setNodes([...ln]);
    setEdges([...le]);
    window.requestAnimationFrame(() => fitView());
  }, [nodes, edges, setNodes, setEdges, fitView]);

  // AI function call 处理器（批量处理）
  const handleFunctionCall = useCallback(
    (calls: Array<{ name: string; args: Record<string, unknown> }>) => {
      handleBatchFunctionCalls(calls, {
        nodes: nodes as Node<SceneNodeData>[],
        edges,
        originalGame,
        setNodes,
        setEdges,
        setOriginalGame,
      });
    },
    [nodes, edges, originalGame, setNodes, setEdges, setOriginalGame],
  );

  if (isAuthPending || loading) return <div className="p-8 text-center">加载中...</div>;
  if (!session) {
    router.push('/sign-in');
    return null;
  }
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;

  return (
    <div className="grow flex flex-col bg-gray-50">
      <EditorToolbar
        title={originalGame?.title || originalGame?.slug}
        slug={slug}
        saving={saving}
        assetGenerating={assetGenerating}
        onToggleViewMode={toggleViewMode}
        onAddScene={handleAddScene}
        onLayout={handleLayout}
        onGenerateAssets={handleGenerateAssets}
        onShowImporter={() => setShowImporter(true)}
        onSave={handleSave}
      />

      {activeTab === 'settings' && originalGame && (
        <div className="grow overflow-y-auto bg-gray-50 p-6">
          <EditorSettingsTab
            game={originalGame}
            id={id}
            onChange={setOriginalGame}
            onSlugChange={setSlug}
            slug={slug}
          />
        </div>
      )}

      {activeTab === 'variables' && originalGame && (
        <div className="grow flex overflow-hidden">
          <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
            <EditorVariablesTab
              state={originalGame.initialState}
              onChange={(newState: GameState) => setOriginalGame({ ...originalGame, initialState: newState })}
              scenes={originalGame.scenes}
            />
          </div>
          {chatOpen && (
            <ChatPanel
              gameId={id}
              isOpen={chatOpen}
              onClose={() => setChatOpen(false)}
              dsl={textContent}
              story={originalGame.backgroundStory}
              characters={originalGame.ai?.characters}
              variables={originalGame.initialState as Record<string, unknown>}
              onFunctionCall={handleFunctionCall}
            />
          )}
        </div>
      )}

      {activeTab === 'characters' && originalGame && (
        <div className="grow flex overflow-hidden">
          <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
            <EditorCharactersTab
              characters={originalGame.ai.characters || {}}
              onChange={(chars: Record<string, AICharacter>) =>
                setOriginalGame({ ...originalGame, ai: { ...originalGame.ai, characters: chars } })
              }
              gameId={id}
            />
          </div>
          {chatOpen && (
            <ChatPanel
              gameId={id}
              isOpen={chatOpen}
              onClose={() => setChatOpen(false)}
              dsl={textContent}
              story={originalGame.backgroundStory}
              characters={originalGame.ai?.characters}
              variables={originalGame.initialState as Record<string, unknown>}
              onFunctionCall={handleFunctionCall}
            />
          )}
        </div>
      )}

      {activeTab === 'story' && (
        <div className="flex grow">
          {viewMode === 'visual' ? (
            <>
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
            </>
          ) : (
            <div className="flex-1 p-6 overflow-hidden">
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                className="w-full h-full p-4 font-mono text-sm bg-white border border-gray-200 rounded-lg shadow-inner focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none outline-none"
                spellCheck={false}
                placeholder="Markdown content..."
              />
            </div>
          )}
          {chatOpen && originalGame && (
            <ChatPanel
              gameId={id}
              isOpen={chatOpen}
              onClose={() => setChatOpen(false)}
              dsl={textContent}
              story={originalGame.backgroundStory}
              characters={originalGame.ai?.characters}
              variables={originalGame.initialState as Record<string, unknown>}
              onFunctionCall={handleFunctionCall}
            />
          )}
        </div>
      )}

      {showImporter && (
        <StoryImporter
          id={id}
          initialStory={originalGame?.storyPrompt}
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
