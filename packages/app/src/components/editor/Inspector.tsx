import { useState } from 'react';
import { Node, Edge } from '@xyflow/react';
import { SceneNodeData } from '@/lib/editor/transformers';
import { Trash2, Plus, Image as ImageIcon, RefreshCw, Loader2 } from 'lucide-react';
import { useParams } from 'next/navigation';

interface InspectorProps {
  selectedNode: Node | null;
  selectedEdge: Edge | null;
  onNodeChange: (id: string, data: Partial<SceneNodeData>) => void;
  onNodeIdChange: (oldId: string, newId: string) => void;
  onEdgeChange: (id: string, changes: { label?: string; data?: any }) => void;
}

export default function Inspector({ selectedNode, selectedEdge, onNodeChange, onNodeIdChange, onEdgeChange }: InspectorProps) {
  const { slug } = useParams();
  const [generatingIndex, setGeneratingIndex] = useState<number | null>(null);

  if (!selectedNode && !selectedEdge) {
    return (
      <div className="w-80 border-l border-gray-200 bg-white p-4 text-sm text-gray-500 hidden md:block">
        Select a node or edge to edit properties.
      </div>
    );
  }

  // Cast data for easier access
  const nodeData = selectedNode ? (selectedNode.data as unknown as SceneNodeData) : null;

  const handleAssetChange = (index: number, field: string, value: string) => {
    if (!selectedNode || !nodeData) return;
    const newAssets = [...(nodeData.assets || [])];
    newAssets[ index ] = { ...newAssets[ index ], [ field ]: value };
    onNodeChange(selectedNode.id, { assets: newAssets });
  };

  const handleAssetDelete = (index: number) => {
    if (!selectedNode || !nodeData) return;
    const newAssets = [...(nodeData.assets || [])];
    newAssets.splice(index, 1);
    onNodeChange(selectedNode.id, { assets: newAssets });
  };

  const handleAddAsset = (type: 'ai_image' | 'ai_audio') => {
    if (!selectedNode || !nodeData) return;
    const newAssets = [...(nodeData.assets || [])];
    if (type === 'ai_image') {
      newAssets.push({ type: 'ai_image', prompt: 'Describe the image...' });
    } else {
      newAssets.push({ type: 'ai_audio', audioType: 'sfx', prompt: 'Describe the sound...' });
    }
    onNodeChange(selectedNode.id, { assets: newAssets });
  };

  const handleRegenerate = async (index: number, asset: any) => {
    if (!asset.prompt || !slug) return;
    setGeneratingIndex(index);
    
    try {
      const res = await fetch('/api/cms/assets/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: asset.prompt,
          gameSlug: slug,
          type: asset.type
        }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        alert(`Generation failed: ${error.error}`);
        return;
      }

      const data = await res.json();
      handleAssetChange(index, 'url', data.url);
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setGeneratingIndex(null);
    }
  };

  return (
    <div className="w-80 border-l border-gray-200 bg-white flex flex-col h-full overflow-y-auto shadow-xl z-20">
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h2 className="font-semibold text-gray-700">Properties</h2>
        <p className="text-xs text-gray-500 truncate">
          {selectedNode ? `Scene: ${nodeData?.label}` : `Choice: ${selectedEdge?.label || 'Untitled'}`}
        </p>
      </div>

      <div className="p-4 space-y-6">
        {selectedNode && nodeData && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Scene ID</label>
              <input
                type="text"
                key={selectedNode.id} 
                defaultValue={nodeData.label}
                onBlur={(e) => onNodeIdChange(selectedNode.id, e.target.value)}
                className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Content</label>
              <textarea
                value={nodeData.content}
                onChange={(e) => onNodeChange(selectedNode.id, { content: e.target.value })}
                className="w-full h-32 p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                placeholder="Scene description..."
              />
            </div>
            
            {/* Assets Editor */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-medium text-gray-700">Assets</label>
                <div className="flex gap-1">
                  <button 
                    onClick={() => handleAddAsset('ai_image')}
                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                    title="Add AI Image"
                  >
                    <ImageIcon size={14} />
                  </button>
                </div>
              </div>
              
              <div className="space-y-3">
                {nodeData.assets && nodeData.assets.length > 0 ? (
                  nodeData.assets.map((asset: any, i: number) => (
                    <div key={i} className="p-3 bg-gray-50 rounded border border-gray-200 text-sm relative group">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-gray-600 uppercase text-xs">{asset.type.replace('ai_', '')}</span>
                        <div className="flex gap-1">
                          <button 
                            onClick={() => handleRegenerate(i, asset)}
                            disabled={generatingIndex === i}
                            className={`p-1 text-gray-400 hover:text-blue-500 ${generatingIndex === i ? 'animate-spin text-blue-500' : ''}`}
                            title="Regenerate Asset"
                          >
                            {generatingIndex === i ? <Loader2 size={14} /> : <RefreshCw size={14} />}
                          </button>
                          <button 
                            onClick={() => handleAssetDelete(i)}
                            className="p-1 text-gray-400 hover:text-red-500"
                            title="Delete Asset"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      
                      {asset.url && asset.type === 'ai_image' && (
                        <div className="mb-2 relative w-full h-24 bg-gray-100 rounded overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={asset.url} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                      )}

                      <textarea
                        value={asset.prompt || ''}
                        onChange={(e) => handleAssetChange(i, 'prompt', e.target.value)}
                        className="w-full p-2 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 resize-none h-16"
                        placeholder="Prompt..."
                      />
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-gray-400 italic text-center py-2">No assets</div>
                )}
              </div>
            </div>
          </>
        )}

        {selectedEdge && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Choice Text</label>
              <input
                type="text"
                value={selectedEdge.label as string || ''}
                onChange={(e) => onEdgeChange(selectedEdge.id, { label: e.target.value })}
                className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Condition (if)</label>
              <input
                type="text"
                value={selectedEdge.data?.condition as string || ''}
                onChange={(e) => onEdgeChange(selectedEdge.id, { data: { ...selectedEdge.data, condition: e.target.value } })}
                placeholder="e.g. has_key == true"
                className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">State Update (set)</label>
              <input
                type="text"
                value={selectedEdge.data?.set as string || ''}
                onChange={(e) => onEdgeChange(selectedEdge.id, { data: { ...selectedEdge.data, set: e.target.value } })}
                placeholder="e.g. gold = gold - 10"
                className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
