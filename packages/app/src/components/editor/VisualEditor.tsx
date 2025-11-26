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
import { Save, ArrowLeft, ExternalLink, FileText, Network, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { parse, stringify } from '@mui-gamebook/parser';
import { gameToFlow, flowToGame, SceneNodeData } from '@/lib/editor/transformers';
import SceneNode from '@/components/editor/SceneNode';
import Inspector from '@/components/editor/Inspector';
import type { Game } from '@mui-gamebook/parser/src/types';

const nodeTypes = { scene: SceneNode };

export default function VisualEditor({ slug }: { slug: string }) {
  const router = useRouter();
  const { data: session, isPending: isAuthPending } = authClient.useSession();
  const { screenToFlowPosition } = useReactFlow();
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [originalGame, setOriginalGame] = useState<Game | null>(null);
  const [viewMode, setViewMode] = useState<'visual' | 'text'>('visual');
  const [textContent, setTextContent] = useState('');
  
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useOnSelectionChange({
    onChange: ({ nodes, edges }) => {
      setSelectedNode(nodes[0] || null);
      setSelectedEdge(edges[0] || null);
    },
  });

  useEffect(() => {
    if (slug) {
      fetch(`/api/cms/games/${slug}`)
        .then(async (res) => {
          if (!res.ok) throw new Error('Failed to load game');
          const data = await res.json();
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
        // @ts-ignore
        const newGame = flowToGame(nodes as any, edges, originalGame);
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
      // @ts-ignore
      const newGame = flowToGame(nodes as any, edges, originalGame);
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
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }
      alert('Saved successfully!');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
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
          return { ...node, data: { ...node.data, ...data } };
        }
        return node;
      })
    );
  };

  const handleEdgeChange = (id: string, changes: { label?: string; data?: any }) => {
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
        </div>
        <div className="flex gap-3">
          {viewMode === 'visual' && (
            <button
              onClick={handleAddScene}
              className="flex items-center gap-2 px-3 py-2 text-green-700 hover:bg-green-50 rounded-md text-sm border border-green-200"
            >
              <PlusCircle size={16} /> Add Scene
            </button>
          )}
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
    </div>
  );
}
