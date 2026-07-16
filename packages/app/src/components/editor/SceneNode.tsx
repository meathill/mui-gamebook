import { Handle, Position, NodeProps } from '@xyflow/react';
import { stripAudioCommentLines } from '@/lib/editor/prose-audio';
import { SceneNodeData } from '@/lib/editor/transformers';

export default function SceneNode({ data }: NodeProps) {
  const { label, content, assets } = data as unknown as SceneNodeData;
  // 画布卡片只做预览，剥掉内联语音注释行
  const previewContent = content ? stripAudioCommentLines(content) : content;

  // 查找第一个图片素材
  const imageAsset = assets?.find(
    (entry) => entry.asset.type === 'static_image' || entry.asset.type === 'ai_image',
  )?.asset;
  const imageUrl = imageAsset && 'url' in imageAsset ? imageAsset.url : undefined;

  return (
    <div className="bg-white border-2 border-gray-200 rounded-lg shadow-sm min-w-[200px] max-w-[300px] overflow-hidden">
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-blue-500"
      />

      {/* 场景图片 - 只在有图片时显示 */}
      {imageUrl && (
        <div className="w-full h-24 bg-gray-100 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={label}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 font-bold text-sm text-gray-700">{label}</div>

      <div className="p-3 text-xs text-gray-600 line-clamp-3 min-h-[40px]">
        {previewContent || <span className="italic text-gray-400">暂无内容</span>}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-blue-500"
      />
    </div>
  );
}
