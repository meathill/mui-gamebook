'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
  MiniMap
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Save, ArrowLeft, ExternalLink, FileText, Network } from 'lucide-react';
import Link from 'next/link';
import { parse, stringify } from '@mui-gamebook/parser';
import { gameToFlow, flowToGame } from '@/lib/editor/transformers';
import SceneNode from '@/components/editor/SceneNode';
import type { Game } from '@mui-gamebook/parser/src/types';

const nodeTypes = { scene: SceneNode };

export default function EditorPage() {
  const { slug } = useParams();
  const router = useRouter();
  const { data: session, isPending: isAuthPending } = authClient.useSession();
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [originalGame, setOriginalGame] = useState<Game | null>(null);
  const [viewMode, setViewMode] = useState<'visual' | 'text'>('visual');
  const [textContent, setTextContent] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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
      // Visual -> Text
      if (originalGame) {
        // @ts-ignore
        const newGame = flowToGame(nodes as any, edges, originalGame);
        const content = stringify(newGame);
        setTextContent(content);
      }
      setViewMode('text');
    } else {
      // Text -> Visual
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

    // If in visual mode, sync to text first
    if (viewMode === 'visual' && originalGame) {
      // @ts-ignore
      const newGame = flowToGame(nodes as any, edges, originalGame);
      contentToSave = stringify(newGame);
      // Also update text content state
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
    (params: Connection) => setEdges((eds) => addEdge({ ...params, type: 'default', label: 'New Choice' }, eds)),
    [setEdges],
  );

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
      <div className="flex-1 w-full bg-gray-50 relative overflow-hidden">
        {viewMode === 'visual' ? (
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
