'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
  useReactFlow
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { parse, stringify } from '@mui-gamebook/parser';
import { gameToFlow, flowToGame, SceneNodeData } from '@/lib/editor/transformers';
import { getLayoutedElements } from '@/lib/editor/layout';
import SceneNode from '@/components/editor/SceneNode';
import Inspector from '@/components/editor/Inspector';
import EditorSettingsTab from '@/components/editor/EditorSettingsTab';
import EditorVariablesTab from '@/components/editor/EditorVariablesTab';
import EditorCharactersTab from '@/components/editor/EditorCharactersTab';
import EditorToolbar, { Tab } from '@/components/editor/EditorToolbar';
import StoryImporter from '@/components/editor/StoryImporter';
import { useDialog } from '@/components/Dialog';
import { pendingOperationsManager, isPlaceholderUrl, extractOperationId } from '@/lib/pending-operations-manager';
import type { Game, GameState, AICharacter } from '@mui-gamebook/parser/src/types';
import type { SceneNode as SceneNodeType } from '@mui-gamebook/parser';

const nodeTypes = { scene: SceneNode };

export default function VisualEditor({ id }: { id: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending: isAuthPending } = authClient.useSession();
  const { screenToFlowPosition, fitView } = useReactFlow();
  const dialog = useDialog();

  const [activeTab, setActiveTab] = useState<Tab>('settings');

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // originalGame holds the metadata (settings) and initial content
  const [originalGame, setOriginalGame] = useState<Game | null>(null);
  const [slug, setSlug] = useState('');
  const [viewMode, setViewMode] = useState<'visual' | 'text'>('visual');
  const [textContent, setTextContent] = useState('');

  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assetGenerating, setAssetGenerating] = useState(false);
  const [error, setError] = useState('');

  const [showImporter, setShowImporter] = useState(false);
  const [importerAutoOpened, setImporterAutoOpened] = useState(false);

  // 追踪已注册的 pending 操作，避免重复注册
  const registeredOperationsRef = useRef<Set<number>>(new Set());

  // 处理 pending 操作完成的回调
  const handleOperationComplete = useCallback((operationId: number, result: { status: 'completed' | 'failed'; url?: string; error?: string }) => {
    const pendingUrl = `pending://${operationId}`;

    // 在所有节点中查找并更新包含此 operationId 的资源
    setNodes((currentNodes) => {
      return currentNodes.map((node) => {
        const nodeData = node.data as SceneNodeData;
        if (!nodeData.assets) return node;

        const hasThisOperation = nodeData.assets.some((asset: SceneNodeType) =>
          'url' in asset && asset.url === pendingUrl
        );

        if (!hasThisOperation) return node;

        const newAssets = nodeData.assets.map((asset: SceneNodeType) => {
          if ('url' in asset && asset.url === pendingUrl) {
            if (result.status === 'completed' && result.url) {
              // 成功：更新为实际 URL
              return { ...asset, url: result.url };
            } else {
              // 失败：清除 URL，让用户可以重新生成
              return { ...asset, url: undefined };
            }
          }
          return asset;
        });

        return { ...node, data: { ...nodeData, assets: newAssets } };
      });
    });

    // 如果失败，显示错误提示
    if (result.status === 'failed') {
      dialog.error(`视频生成失败：${result.error || '未知错误'}`);
    }

    // 从已注册集合中移除
    registeredOperationsRef.current.delete(operationId);
  }, [setNodes, dialog]);

  // 扫描节点中的 pending URL 并注册到管理器
  const scanAndRegisterPendingOperations = useCallback(() => {
    nodes.forEach((node) => {
      const nodeData = node.data as SceneNodeData;
      if (!nodeData.assets) return;

      nodeData.assets.forEach((asset: SceneNodeType) => {
        if ('url' in asset && asset.url && isPlaceholderUrl(asset.url)) {
          const operationId = extractOperationId(asset.url);
          if (operationId && !registeredOperationsRef.current.has(operationId)) {
            registeredOperationsRef.current.add(operationId);
            pendingOperationsManager.register(operationId, handleOperationComplete);
          }
        }
      });
    });
  }, [nodes, handleOperationComplete]);

  // 当节点变化时，扫描并注册 pending 操作
  useEffect(() => {
    scanAndRegisterPendingOperations();
  }, [scanAndRegisterPendingOperations]);

  // 当加载完成后，检查 URL 参数决定是否自动打开导入器
  useEffect(() => {
    if (!loading && !importerAutoOpened && searchParams.get('showImporter') === 'true') {
      setShowImporter(true);
      setImporterAutoOpened(true);
      // 清除 URL 参数
      router.replace(`/admin/edit/${id}`);
    }
  }, [loading, importerAutoOpened, searchParams, router, id]);

  useOnSelectionChange({
    onChange: ({ nodes, edges }) => {
      setSelectedNode(nodes[ 0 ] || null);
      setSelectedEdge(edges[ 0 ] || null);
    },
  });

  useEffect(() => {
    if (!id) return;

    fetch(`/api/cms/games/${id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load game');
        const data = (await res.json()) as { content: string; slug: string } & Game;
        const result = parse(data.content);
        if (result.success) {
          setOriginalGame({ ...result.data, ...data });
          setSlug(data.slug);
          setTextContent(data.content);
          const flow = gameToFlow(result.data);
          setNodes(flow.nodes);
          setEdges(flow.edges);
        } else {
          throw new Error(`Parse error: ${result.error}`);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, setNodes, setEdges]);

  const toggleViewMode = async () => {
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
        // Preserve metadata from Settings tab (originalGame) when switching back from text
        setOriginalGame(prev => ({ ...result.data, ...prev, scenes: result.data.scenes }));
        const flow = gameToFlow(result.data);
        setNodes(flow.nodes);
        setEdges(flow.edges);
        setViewMode('visual');
      } else {
        await dialog.error(`无法切换到可视化模式：Markdown 格式无效。\n\n${result.error}`);
      }
    }
  };

  const handleSave = async () => {
    if (!originalGame) return;
    setSaving(true);

    try {
      let gameToSave = originalGame;

      // If we are in Story tab, we need to sync content to gameToSave
      if (activeTab === 'story') {
        if (viewMode === 'visual') {
          gameToSave = flowToGame(nodes as Node<SceneNodeData>[], edges, originalGame);
        } else {
          const result = parse(textContent);
          if (result.success) {
             // Merge parsed content with current metadata settings
             gameToSave = { ...originalGame, scenes: result.data.scenes };
          } else {
             throw new Error(`Cannot save: Invalid Markdown. ${result.error}`);
          }
        }
      } else {
        // If in Settings tab, we need to ensure the content (nodes/edges or text) is preserved
        // Since originalGame holds metadata, we need to merge latest scenes into it.
        if (viewMode === 'visual') {
           const contentGame = flowToGame(nodes as Node<SceneNodeData>[], edges, originalGame);
           gameToSave = { ...originalGame, scenes: contentGame.scenes };
        } else {
           const result = parse(textContent);
           if (result.success) {
             gameToSave = { ...originalGame, scenes: result.data.scenes };
           }
        }
      }

      const content = stringify(gameToSave);

      // Update text content state to reflect saved state
      setTextContent(content);

      const res = await fetch(`/api/cms/games/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, slug }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || 'Failed to save');
      }
      const result = (await res.json()) as { slug?: string };
      if (result.slug) {
        setSlug(result.slug);
      }
      await dialog.success('保存成功！');
    } catch (err: unknown) {
      await dialog.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateAssets = async () => {
    const confirmed = await dialog.confirm('这将扫描所有节点并生成缺失的 AI 素材。可能需要一些时间，确定继续吗？');
    if (!confirmed) return;
    setAssetGenerating(true);
    await handleSave(); // Save first

    try {
      const res = await fetch(`/api/cms/games/${id}/batch-generate-assets`, { method: 'POST' });
      const data = (await res.json()) as {
        updatedCount?: number;
        error?: string;
      };
      if (res.ok) {
        await dialog.success(`成功生成 ${data.updatedCount} 个素材！页面即将刷新...`);
        window.location.reload();
      } else {
        throw new Error(data.error);
      }
    } catch (e: unknown) {
      await dialog.error(`素材生成失败：${(e as Error).message}`);
    } finally {
      setAssetGenerating(false);
    }
  };

  const handleScriptImport = async (script: string) => {
    const result = parse(script);
    if (result.success) {
      // Merge imported script with current metadata? Or overwrite?
      // Usually import script implies overwriting structure.
      setOriginalGame(prev => ({ ...prev, ...result.data }));
      setTextContent(script);
      const flow = gameToFlow(result.data);
      setNodes(flow.nodes);
      setEdges(flow.edges);
      if (viewMode === 'text') {
        setViewMode('visual');
      }
    } else {
      await dialog.error(`导入的脚本无效：${result.error}`);
    }
  };

  // ... Flow Handlers ...
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, type: 'default', label: 'Choice' },eds)),
    [setEdges],
  );

  const handleNodeChange = (id: string, data: Partial<SceneNodeData>) => {
    setNodes((nds) => nds.map((node) => node.id === id ? { ...node, data: { ...node.data, ...data } } : node));
    // 同步更新 selectedNode，确保 Inspector 显示最新数据
    if (selectedNode && selectedNode.id === id) {
      setSelectedNode((prev) => prev ? { ...prev, data: { ...prev.data, ...data } } : null);
    }
  };

  const handleNodeIdChange = async (oldId: string, newId: string) => {
    if (!newId || oldId === newId) return;
    if (nodes.some(n => n.id === newId)) {
      await dialog.alert(`场景 ID "${newId}" 已存在。`);
      return;
    }
    setNodes((nds) => nds.map(node => node.id === oldId ? { ...node, id: newId, data: { ...node.data, label: newId } } : node));
    setEdges((eds) => eds.map(edge => {
      let u = false, s = edge.source, t = edge.target;
      if (s === oldId) { s = newId; u = true; }
      if (t === oldId) { t = newId; u = true; }
      return u ? { ...edge, source: s, target: t } : edge;
    }));
  };

  const handleEdgeChange = (id: string, changes: { label?: string; data?: Record<string, unknown> }) => {
    setEdges((eds) =>eds.map((edge) => edge.id === id ? { ...edge, ...(changes.label ? { label: changes.label } : {}), ...(changes.data ? { data: { ...edge.data, ...changes.data } } : {}) } : edge));
  };

  const handleAddScene = () => {
    const id = `scene_${Date.now().toString().slice(-4)}`;
    const newNode = {
      id,
      position: screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 }),
      data: { label: id, content: 'New scene content', assets: [] },
      type: 'scene',
    };
    setNodes((nds) => nds.concat(newNode));
  };

  const handleLayout = useCallback(() => {
    const { nodes: ln, edges: le } = getLayoutedElements(nodes, edges);
    setNodes([...ln]);
    setEdges([...le]);
    window.requestAnimationFrame(() => fitView());
  }, [nodes, edges, setNodes, setEdges, fitView]);

  if (isAuthPending || loading) return <div className="p-8 text-center">加载中...</div>;
  if (!session) { router.push('/sign-in'); return null; }
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;

  return (
    <div className="grow flex flex-col bg-gray-50">
      {/* Toolbar */}
      <EditorToolbar
        title={originalGame?.title || originalGame?.slug}
        slug={slug}
        activeTab={activeTab}
        viewMode={viewMode}
        saving={saving}
        assetGenerating={assetGenerating}
        onTabChange={setActiveTab}
        onToggleViewMode={toggleViewMode}
        onAddScene={handleAddScene}
        onLayout={handleLayout}
        onGenerateAssets={handleGenerateAssets}
        onShowImporter={() => setShowImporter(true)}
        onSave={handleSave}
      />

      {/* Main Content */}
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
        <div className="grow overflow-y-auto bg-gray-50 p-6">
          <EditorVariablesTab
            state={originalGame.initialState}
            onChange={(newState: GameState) => setOriginalGame({ ...originalGame, initialState: newState })}
            scenes={originalGame.scenes}
          />
        </div>
      )}

      {activeTab === 'characters' && originalGame && (
        <div className="grow overflow-y-auto bg-gray-50 p-6">
          <EditorCharactersTab
            characters={originalGame.ai.characters || {}}
            onChange={(chars: Record<string, AICharacter>) =>
              setOriginalGame({ ...originalGame, ai: { ...originalGame.ai, characters: chars } })
            }
            gameId={id}
          />
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
                  fitView
                >
                  <Background />
                  <Controls />
                  <MiniMap />
                </ReactFlow>
              </div>
              <Inspector
                selectedNode={selectedNode}
                selectedEdge={selectedEdge}
                onNodeChange={handleNodeChange}
                onNodeIdChange={handleNodeIdChange}
                onEdgeChange={handleEdgeChange}
              />
            </>
          ) : (
            <div className="w-full h-full p-6 overflow-hidden">
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                className="w-full h-full p-4 font-mono text-sm bg-white border border-gray-200 rounded-lg shadow-inner focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none outline-none"
                spellCheck={false}
                placeholder="Markdown content..."
              />
            </div>
          )}
        </div>
      )}

      {showImporter && (
        <StoryImporter
          id={id}
          onImport={handleScriptImport}
          onClose={() => setShowImporter(false)}
        />
      )}
    </div>
  );
}
