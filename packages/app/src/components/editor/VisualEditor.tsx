'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
import { Save, ArrowLeft, ExternalLink, FileText, Network, PlusCircle, Layout, Sparkles, ImagePlus, Settings, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { parse, stringify } from '@mui-gamebook/parser';
import { gameToFlow, flowToGame, SceneNodeData } from '@/lib/editor/transformers';
import { getLayoutedElements } from '@/lib/editor/layout';
import SceneNode from '@/components/editor/SceneNode';
import Inspector from '@/components/editor/Inspector';
import EditorSettingsTab from '@/components/editor/EditorSettingsTab';
import StoryImporter from '@/components/editor/StoryImporter';
import type { Game } from '@mui-gamebook/parser/src/types';

const nodeTypes = { scene: SceneNode };

type Tab = 'settings' | 'story';

export default function VisualEditor({ slug }: { slug: string }) {
  const router = useRouter();
  const { data: session, isPending: isAuthPending } = authClient.useSession();
  const { screenToFlowPosition, fitView } = useReactFlow();

  const [activeTab, setActiveTab] = useState<Tab>('settings');

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // originalGame holds the metadata (settings) and initial content
  const [originalGame, setOriginalGame] = useState<Game | null>(null);
  const [viewMode, setViewMode] = useState<'visual' | 'text'>('visual');
  const [textContent, setTextContent] = useState('');

  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assetGenerating, setAssetGenerating] = useState(false);
  const [error, setError] = useState('');

  const [showImporter, setShowImporter] = useState(false);

  useOnSelectionChange({
    onChange: ({ nodes, edges }) => {
      setSelectedNode(nodes[ 0 ] || null);
      setSelectedEdge(edges[ 0 ] || null);
    },
  });

  useEffect(() => {
    if (slug) {
      fetch(`/api/cms/games/${slug}`)
        .then(async (res) => {
          if (!res.ok) throw new Error('Failed to load game');
          const data = (await res.json()) as { content: string } & Game;
          const result = parse(data.content);
          if (result.success) {
            // Merge API metadata (like slug) with parsed content if needed,
            // but mostly we trust the parsed content for structure.
            setOriginalGame({ ...result.data, ...data }); // data contains slug
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
    }
  }, [slug, setNodes, setEdges]);

  const toggleViewMode = () => {
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
        alert(`Cannot switch to visual mode: Invalid Markdown.\n\n${result.error}`);
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

      const res = await fetch(`/api/cms/games/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || 'Failed to save');
      }
      alert('Saved successfully!');
    } catch (err: unknown) {
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateAssets = async () => {
    if (!confirm('This will scan all nodes and generate missing AI assets. It might take a while. Continue?')) return;
    setAssetGenerating(true);
    await handleSave(); // Save first

    try {
      const res = await fetch(`/api/cms/games/${slug}/batch-generate-assets`, { method: 'POST' });
      const data = (await res.json()) as {
        updatedCount?: number;
        error?: string;
      };
      if (res.ok) {
        alert(`Generated ${data.updatedCount} assets successfully! Reloading...`);
        window.location.reload();
      } else {
        throw new Error(data.error);
      }
    } catch (e: unknown) {
      alert(`Asset generation failed: ${(e as Error).message}`);
    } finally {
      setAssetGenerating(false);
    }
  };

  const handleScriptImport = (script: string) => {
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
      alert(`Imported script is invalid: ${result.error}`);
    }
  };

  // ... Flow Handlers ...
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, type: 'default', label: 'Choice' },eds)),
    [setEdges],
  );

  const handleNodeChange = (id: string, data: Partial<SceneNodeData>) => {
    setNodes((nds) => nds.map((node) => node.id === id ? { ...node, data: { ...node.data, ...data } } : node));
  };

  const handleNodeIdChange = (oldId: string, newId: string) => {
    if (!newId || oldId === newId) return;
    if (nodes.some(n => n.id === newId)) { alert(`Scene ID "${newId}" already exists.`); return; }
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

  if (isAuthPending || loading) return <div className="p-8 text-center">Loading...</div>;
  if (!session) { router.push('/sign-in'); return null; }
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Toolbar */}
      <header className="bg-white border-b px-6 py-3 flex justify-between items-center z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="font-semibold text-gray-900 hidden md:block">{originalGame?.title || slug}</h1>

          {/* Tabs */}
          <div className="flex bg-gray-100 p-1 rounded-lg ml-4">
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'settings' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
              <Settings size={16} /> Settings
            </button>
            <button
              onClick={() => setActiveTab('story')}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'story' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
              <BookOpen size={16} /> Story
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          {activeTab === 'story' && viewMode === 'visual' && (
            <>
              <button onClick={handleAddScene} className="p-2 text-green-700 hover:bg-green-50 rounded border border-green-200" title="Add Scene">
                <PlusCircle size={18} />
              </button>
              <button onClick={handleLayout} className="p-2 text-gray-700 hover:bg-gray-100 rounded border border-gray-200" title="Auto Layout">
                <Layout size={18} />
              </button>
            </>
          )}

          {activeTab === 'story' && (
            <>
              <button onClick={() => setShowImporter(true)} className="flex items-center gap-2 px-3 py-2 text-purple-700 hover:bg-purple-50 rounded text-sm border border-purple-200">
                <Sparkles size={16} /> <span className="hidden sm:inline">AI Story</span>
              </button>
              <button onClick={handleGenerateAssets} disabled={assetGenerating} className="flex items-center gap-2 px-3 py-2 text-orange-700 hover:bg-orange-50 rounded text-sm border border-orange-200">
                <ImagePlus size={16} /> <span className="hidden sm:inline">{assetGenerating ? '...' : 'Assets'}</span>
              </button>
              <button onClick={toggleViewMode} className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded text-sm border border-gray-200">
                {viewMode === 'visual' ? <FileText size={16} /> : <Network size={16} />}
                <span className="hidden sm:inline">{viewMode === 'visual' ? 'Text' : 'Visual'}</span>
              </button>
            </>
          )}

          <Link href={`/play/${slug}`} target="_blank" className="p-2 text-gray-600 hover:bg-gray-100 rounded border border-gray-200" title="Preview">
            <ExternalLink size={18} />
          </Link>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">
            <Save size={16} /> {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab === 'settings' && originalGame && (
          <div className="h-full overflow-y-auto bg-gray-50 p-6">
            <EditorSettingsTab
              game={originalGame}
              onChange={setOriginalGame}
              slug={slug}
            />
          </div>
        )}

        {activeTab === 'story' && (
          <div className="flex h-full">
            {viewMode === 'visual' ? (
              <>
                <div className="flex-1 h-full relative">
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
      </div>

      {showImporter && (
        <StoryImporter
          slug={slug}
          onImport={handleScriptImport}
          onClose={() => setShowImporter(false)}
        />
      )}
    </div>
  );
}
