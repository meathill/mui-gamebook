import { Handle, Position, NodeProps } from '@xyflow/react';
import { SceneNodeData } from '@/lib/editor/transformers';
import { ImageIcon } from 'lucide-react';

export default function SceneNode({ data }: NodeProps) {
  const { label, content, assets } = data as unknown as SceneNodeData;
  
  // 查找第一个图片素材
  const imageAsset = assets?.find(a => a.type === 'static_image' || a.type === 'ai_image');
  const imageUrl = imageAsset && 'url' in imageAsset ? imageAsset.url : undefined;

  return (
    <div className="bg-white border-2 border-gray-200 rounded-lg shadow-sm min-w-[200px] max-w-[300px] overflow-hidden">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-blue-500" />
      
      {/* 场景图片 */}
      {imageUrl ? (
        <div className="w-full h-24 bg-gray-100 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={imageUrl} 
            alt={label}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="w-full h-16 bg-gray-100 flex items-center justify-center">
          <ImageIcon className="w-6 h-6 text-gray-300" />
        </div>
      )}
      
      <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 font-bold text-sm text-gray-700">
        {label}
      </div>
      
      <div className="p-3 text-xs text-gray-600 line-clamp-3 min-h-[40px]">
        {content || <span className="italic text-gray-400">暂无内容</span>}
      </div>

      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-blue-500" />
    </div>
  );
}
