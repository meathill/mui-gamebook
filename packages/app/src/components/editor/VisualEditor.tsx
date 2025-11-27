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
import { Save, ArrowLeft, ExternalLink, FileText, Network, PlusCircle, Layout, Settings, Sparkles, ImagePlus } from 'lucide-react';
import Link from 'next/link';
import { parse, stringify } from '@mui-gamebook/parser';
import { gameToFlow, flowToGame, SceneNodeData } from '@/lib/editor/transformers';
import { getLayoutedElements } from '@/lib/editor/layout';
import SceneNode from '@/components/editor/SceneNode';
import Inspector from '@/components/editor/Inspector';
import GameSettings from '@/components/editor/GameSettings';
import StoryImporter from '@/components/editor/StoryImporter';
import type { Game } from '@mui-gamebook/parser/src/types';

const nodeTypes = { scene: SceneNode };

export default function VisualEditor({ slug }: { slug: string }) {
  const router = useRouter();
  const { data: session, isPending: isAuthPending } = authClient.useSession();
  const { screenToFlowPosition, fitView } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [originalGame, setOriginalGame] = useState<Game | null>(null);
  const [viewMode, setViewMode] = useState<'visual' | 'text'>('visual');
  const [textContent, setTextContent] = useState('');

  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assetGenerating, setAssetGenerating] = useState(false);
  const [error, setError] = useState('');

  const [showSettings, setShowSettings] = useState(false);
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
          const data = (await res.json()) as { content: string };
          const result = parse(data.content);
          if (result.success) {
            setOriginalGame(result.data);
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
        setOriginalGame(result.data);
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
    let contentToSave = textContent;

    if (viewMode === 'visual' && originalGame) {
      const newGame = flowToGame(nodes as Node<SceneNodeData>[], edges, originalGame);
      contentToSave = stringify(newGame);
      setTextContent(contentToSave);
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/cms/games/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: contentToSave }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error: string };
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

    // Ensure we save first to have latest state in DB
    await handleSave();

    try {
      const res = await fetch(`/api/cms/games/${slug}/batch-generate-assets`, {
        method: 'POST',
      });
      const data = (await res.json()) as {
        error?: string;
        updatedCount: string;
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

  const handleSettingsSave = (updatedGame: Game) => {
    setOriginalGame(updatedGame);
    if (viewMode === 'text') {
       const content = stringify(updatedGame);
       setTextContent(content);
    }
  };

  const handleScriptImport = (script: string) => {
    const result = parse(script);
    if (result.success) {
      setOriginalGame(result.data);
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

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, type: 'default', label: 'Choice' },eds)),
    [setEdges],
  );

  const handleNodeChange = (id: string, data: Partial<SceneNodeData>) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          const updatedNode = { ...node, data: { ...node.data, ...data } };
          if (selectedNode?.id === id) {
            setSelectedNode(updatedNode);
          }
          return updatedNode;
        }
        return node;
      })
    );
  };

  const handleNodeIdChange = (oldId: string, newId: string) => {
    if (!newId || oldId === newId) return;

    // Check for duplicate ID
    if (nodes.some(n => n.id === newId)) {
      alert(`Scene ID "${newId}" already exists.`);
      return;
    }

    // Update Nodes
    setNodes((nds) => nds.map(node => {
      if (node.id === oldId) {
        const updatedNode = { ...node, id: newId, data: { ...node.data, label: newId } };
        if (selectedNode?.id === oldId) {
          setSelectedNode(updatedNode);
        }
        return updatedNode;
      }
      return node;
    }));

    // Update Edges
    setEdges((eds) =>eds.map(edge => {
      let updated = false;
      let newSource = edge.source;
      let newTarget = edge.target;

      if (edge.source === oldId) {
        newSource = newId;
        updated = true;
      }
      if (edge.target === oldId) {
        newTarget = newId;
        updated = true;
      }

      return updated ? { ...edge, source: newSource, target: newTarget } : edge;
    }));
  };

  const handleEdgeChange = (id: string, changes: { label?: string; data?: Record<string, unknown> }) => {
    setEdges((eds) =>
      eds.map((edge) => {
        if (edge.id === id) {
          return {
            ...edge,
            ...(changes.label ? { label: changes.label } : {}),
            ...(changes.data ? { data: { ...edge.data, ...changes.data } } : {})
          };
        }
        return edge;
      })
    );
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
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      nodes,
      edges
    );
    setNodes([...layoutedNodes]);
    setEdges([...layoutedEdges]);
    window.requestAnimationFrame(() => fitView());
  }, [nodes, edges, setNodes, setEdges, fitView]);

  if (isAuthPending || loading) return <div className="p-8 text-center">Loading...</div>;
  if (!session) { router.push('/sign-in'); return null; }
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;

  return (
    <div className="h-screen flex flex-col">
      {/* Toolbar */}
      <header className="bg-white border-b px-6 py-3 flex justify-between items-center z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="font-semibold text-gray-900">Editor: {slug}</h1>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-full"
            title="Game Settings"
          >
            <Settings size={20} />
          </button>
        </div>
        <div className="flex gap-3">
          {viewMode === 'visual' && (
            <>
              <button
                onClick={handleAddScene}
                className="flex items-center gap-2 px-3 py-2 text-green-700 hover:bg-green-50 rounded-md text-sm border border-green-200"
              >
                <PlusCircle size={16} /> Add Scene
              </button>
              <button
                onClick={handleLayout}
                className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md text-sm border border-gray-200"
                title="Auto Layout"
              >
                <Layout size={16} /> Layout
              </button>
            </>
          )}

          <button
            onClick={() => setShowImporter(true)}
            className="flex items-center gap-2 px-3 py-2 text-purple-700 hover:bg-purple-50 rounded-md text-sm border border-purple-200"
          >
            <Sparkles size={16} /> AI Story
          </button>

          <button
            onClick={handleGenerateAssets}
            disabled={assetGenerating}
            className="flex items-center gap-2 px-3 py-2 text-orange-700 hover:bg-orange-50 rounded-md text-sm border border-orange-200"
          >
            <ImagePlus size={16} /> {assetGenerating ? 'Generating...' : 'Gen Assets'}
          </button>

          <button
            onClick={toggleViewMode}
            className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md text-sm border border-gray-200"
            title={viewMode === 'visual' ? 'Switch to Text Editor' : 'Switch to Visual Editor'}
          >
            {viewMode === 'visual' ? <FileText size={16} /> : <Network size={16} />}
            {viewMode === 'visual' ? 'Text Mode' : 'Visual Mode'}
          </button>

          <Link
            href={`/play/${slug}`}
            target="_blank"
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-md text-sm"
          >
            <ExternalLink size={16} /> Preview
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
          >
            <Save size={16} /> {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </header>

      {/* Main Area */}
      <div className="flex-1 w-full bg-gray-50 relative overflow-hidden flex">
        {viewMode === 'visual' ? (
          <>
            <div className="flex-1 h-full">
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
          <div className="w-full h-full p-6">
            <textarea
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              className="w-full h-full p-4 font-mono text-sm bg-white border border-gray-200 rounded-lg shadow-inner focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none outline-none"
              spellCheck={false}
              placeholder="Write your game script here using Markdown..."
            />
          </div>
        )}
      </div>

      {/* Modals */}
      {showSettings && originalGame && (
        <GameSettings
          game={originalGame}
          onSave={handleSettingsSave}
          onClose={() => setShowSettings(false)}
        />
      )}

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
