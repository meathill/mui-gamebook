import { Handle, Position, NodeProps } from '@xyflow/react';
import { SceneNodeData } from '@/lib/editor/transformers';

export default function SceneNode({ data }: NodeProps) {
  const { label, content } = data as unknown as SceneNodeData;

  return (
    <div className="bg-white border-2 border-gray-200 rounded-lg shadow-sm min-w-[200px] max-w-[300px] overflow-hidden">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-blue-500" />
      
      <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 font-bold text-sm text-gray-700">
        {label}
      </div>
      
      <div className="p-3 text-xs text-gray-600 line-clamp-3 min-h-[40px]">
        {content || <span className="italic text-gray-400">No content</span>}
      </div>

      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-blue-500" />
    </div>
  );
}
