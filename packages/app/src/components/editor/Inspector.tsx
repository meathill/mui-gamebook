import { useState, useRef, ChangeEvent } from 'react';
import { Node, Edge } from '@xyflow/react';
import { SceneNodeData } from '@/lib/editor/transformers';
import { Trash2, Image as ImageIcon, Loader2, Upload, Sparkles, Music, Video } from 'lucide-react';
import { useParams } from 'next/navigation';
import { SceneNode } from '@mui-gamebook/parser';
import { useDialog } from '@/components/Dialog';

interface InspectorProps {
  selectedNode: Node | null;
  selectedEdge: Edge | null;
  onNodeChange: (id: string, data: Partial<SceneNodeData>) => void;
  onNodeIdChange: (oldId: string, newId: string) => void;
  onEdgeChange: (id: string, changes: { label?: string; data?: Record<string, unknown> }) => void;
}

export default function Inspector({ selectedNode, selectedEdge, onNodeChange, onNodeIdChange, onEdgeChange }: InspectorProps) {
  const { id } = useParams();
  const [generatingIndex, setGeneratingIndex] = useState<number | null>(null);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingUploadIndexRef = useRef<number | null>(null);
  const pendingAssetsRef = useRef<SceneNode[] | null>(null);
  const dialog = useDialog();

  if (!selectedNode && !selectedEdge) {
    return (
      <div className="w-80 border-l border-gray-200 bg-white p-4 text-sm text-gray-500 hidden md:block">
        选择一个节点或边来编辑属性。
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

  const handleAddAsset = (type: 'ai_image' | 'ai_audio' | 'ai_video' | 'static_image' | 'static_audio' | 'static_video') => {
    if (!selectedNode || !nodeData) return;
    const newAssets = [...(nodeData.assets || [])];
    const newIndex = newAssets.length;

    if (type === 'ai_image') {
      newAssets.push({ type: 'ai_image', prompt: '描述图片内容...' });
    } else if (type === 'ai_audio') {
      newAssets.push({ type: 'ai_audio', audioType: 'sfx', prompt: '描述音效内容...' });
    } else if (type === 'ai_video') {
      newAssets.push({ type: 'ai_video', prompt: '描述视频内容...' });
    } else if (type === 'static_image') {
      newAssets.push({ type: 'static_image', url: '' });
    } else if (type === 'static_audio') {
      newAssets.push({ type: 'static_audio', url: '' });
    } else if (type === 'static_video') {
      newAssets.push({ type: 'static_video', url: '' });
    }
    onNodeChange(selectedNode.id, { assets: newAssets });

    // 对于静态资源，立即触发文件选择器
    if (type.startsWith('static_')) {
      const accept = type === 'static_image' ? 'image/*' : type === 'static_audio' ? 'audio/*' : 'video/*';
      // 保存新的 assets 数组到 ref，以便上传完成后使用
      pendingAssetsRef.current = newAssets;
      // 使用 setTimeout 确保 DOM 更新后再触发
      setTimeout(() => triggerUpload(newIndex, accept), 0);
    }
  };

  const handleUpload = async (file: File, index: number) => {
    console.log('[Inspector] handleUpload called', { file: file.name, index, id, hasSelectedNode: !!selectedNode });
    if (!id || !selectedNode) {
      console.log('[Inspector] handleUpload early return - missing id or selectedNode');
      return;
    }
    setUploadingIndex(index);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('id', id as string);
    formData.append('type', 'asset');

    console.log('[Inspector] Sending upload request...');
    try {
      const res = await fetch('/api/cms/assets/upload', {
        method: 'POST',
        body: formData,
      });
      console.log('[Inspector] Upload response received', { status: res.status });
      const data = (await res.json()) as { url: string; error?: string };
      if (res.ok) {
        // 使用 pendingAssetsRef 如果存在，否则使用当前的 nodeData.assets
        const currentAssets = pendingAssetsRef.current || nodeData?.assets || [];
        const newAssets = [...currentAssets];
        if (newAssets[ index ]) {
          newAssets[ index ] = { ...newAssets[ index ], url: data.url } as SceneNode;
          onNodeChange(selectedNode.id, { assets: newAssets });
        }
        pendingAssetsRef.current = null;
      } else {
        await dialog.error(data.error || '上传失败');
      }
    } catch (e) {
      console.error('[Inspector] Upload error:', e);
      await dialog.error('上传失败：' + (e as Error).message);
    } finally {
      setUploadingIndex(null);
    }
  };

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    console.log('[Inspector] handleFileSelect triggered', {
      files: e.target.files,
      pendingIndex: pendingUploadIndexRef.current,
    });
    const file = e.target.files?.[ 0 ];
    if (file && pendingUploadIndexRef.current !== null) {
      console.log('[Inspector] Calling handleUpload with file:', file.name);
      await handleUpload(file, pendingUploadIndexRef.current);
    } else {
      console.log('[Inspector] No file or pendingIndex is null');
    }
    pendingUploadIndexRef.current = null;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerUpload = (index: number, accept: string) => {
    console.log('[Inspector] triggerUpload called', { index, accept, hasRef: !!fileInputRef.current });
    if (fileInputRef.current) {
      fileInputRef.current.accept = accept;
      pendingUploadIndexRef.current = index;
      // 如果没有设置 pendingAssetsRef，使用当前的 assets
      if (!pendingAssetsRef.current && nodeData?.assets) {
        pendingAssetsRef.current = [...nodeData.assets];
      }
      console.log('[Inspector] Clicking file input');
      fileInputRef.current.click();
    } else {
      console.log('[Inspector] fileInputRef.current is null');
    }
  };

  const handleRegenerate = async (index: number, asset: SceneNode) => {
    if (!('prompt' in asset) || !id) return;
    setGeneratingIndex(index);

    try {
      const res = await fetch('/api/cms/assets/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: asset.prompt,
          gameId: id,
          type: asset.type
        }),
      });

      if (!res.ok) {
        const error = (await res.json()) as {
          error: string;
        };
        await dialog.error(`生成失败：${error.error}`);
        return;
      }

      const data = (await res.json()) as {
        url: string;
      };
      handleAssetChange(index, 'url', data.url);
    } catch (e: unknown) {
      await dialog.error(`错误：${(e as Error).message}`);
    } finally {
      setGeneratingIndex(null);
    }
  };

  return (
    <div className="w-80 border-l border-gray-200 bg-white flex flex-col h-full overflow-y-auto shadow-xl z-20">
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h2 className="font-semibold text-gray-700">属性</h2>
        <p className="text-xs text-gray-500 truncate">
          {selectedNode ? `场景：${nodeData?.label}` : `选项：${selectedEdge?.label || '未命名'}`}
        </p>
      </div>

      <div className="p-4 space-y-6">
        {selectedNode && nodeData && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">场景 ID</label>
              <input
                type="text"
                key={selectedNode.id}
                defaultValue={nodeData.label}
                onBlur={(e) => onNodeIdChange(selectedNode.id, e.target.value)}
                className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">内容</label>
              <textarea
                value={nodeData.content}
                onChange={(e) => onNodeChange(selectedNode.id, { content: e.target.value })}
                className="w-full h-32 p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                placeholder="场景描述..."
              />
            </div>

            {/* Assets Editor */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-medium text-gray-700">素材</label>
                <div className="flex gap-1">
                  {/* AI 生成按钮组 */}
                  <div className="flex items-center border-r border-gray-300 pr-1 mr-1">
                    <button
                      onClick={() => handleAddAsset('ai_image')}
                      className="p-1 text-purple-600 hover:bg-purple-50 rounded"
                      title="AI 生成图片"
                    >
                      <Sparkles size={14} />
                    </button>
                    <button
                      onClick={() => handleAddAsset('ai_audio')}
                      className="p-1 text-purple-600 hover:bg-purple-50 rounded"
                      title="AI 生成音频"
                    >
                      <Music size={14} />
                    </button>
                  </div>
                  {/* 上传按钮组 */}
                  <div className="flex items-center">
                    <button
                      onClick={() => handleAddAsset('static_image')}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                      title="上传图片"
                    >
                      <ImageIcon size={14} />
                    </button>
                    <button
                      onClick={() => handleAddAsset('static_audio')}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                      title="上传音频"
                    >
                      <Music size={14} />
                    </button>
                    <button
                      onClick={() => handleAddAsset('static_video')}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                      title="上传视频"
                    >
                      <Video size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* 隐藏的文件上传 input */}
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileSelect}
              />

              <div className="space-y-3">
                {nodeData.assets && nodeData.assets.length > 0 ? (
                  nodeData.assets.map((asset: SceneNode, i: number) => {
                    const isAiAsset = asset.type.startsWith('ai_');
                    const isStaticAsset = asset.type.startsWith('static_');
                    const assetUrl = 'url' in asset ? asset.url : undefined;
                    const assetPrompt = 'prompt' in asset ? asset.prompt : undefined;
                    const isImage = asset.type.includes('image');
                    const isAudio = asset.type.includes('audio');
                    const isVideo = asset.type.includes('video');

                    return (
                      <div key={i} className="p-3 bg-gray-50 rounded border border-gray-200 text-sm relative group">
                        <div className="flex justify-between items-center mb-2">
                          <span className={`font-bold uppercase text-xs ${isAiAsset ? 'text-purple-600' : 'text-blue-600'}`}>
                            {isAiAsset ? 'AI ' : ''}{asset.type.replace('ai_', '').replace('static_', '')}
                          </span>
                          <div className="flex gap-1">
                            {/* 上传按钮 - 对所有类型都可用 */}
                            <button
                              onClick={() => triggerUpload(i, isImage ? 'image/*' : isAudio ? 'audio/*' : 'video/*')}
                              disabled={uploadingIndex === i}
                              className={`p-1 text-gray-400 hover:text-blue-500 ${uploadingIndex === i ? 'text-blue-500' : ''}`}
                              title="上传文件"
                            >
                              {uploadingIndex === i ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                            </button>
                            {/* AI 生成按钮 - 仅对 AI 类型可用 */}
                            {isAiAsset && (
                              <button
                                onClick={() => handleRegenerate(i, asset)}
                                disabled={generatingIndex === i}
                                className={`p-1 text-gray-400 hover:text-purple-500 ${generatingIndex === i ? 'text-purple-500' : ''}`}
                                title="AI 生成"
                              >
                                {generatingIndex === i ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                              </button>
                            )}
                            <button
                              onClick={() => handleAssetDelete(i)}
                              className="p-1 text-gray-400 hover:text-red-500"
                              title="删除素材"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* 预览区域 */}
                        {assetUrl && isImage && (
                          <div className="mb-2 relative w-full h-24 bg-gray-100 rounded overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={assetUrl} alt="预览" className="w-full h-full object-cover" />
                          </div>
                        )}
                        {assetUrl && isAudio && (
                          <div className="mb-2">
                            <audio src={assetUrl} controls className="w-full h-8" />
                          </div>
                        )}
                        {assetUrl && isVideo && (
                          <div className="mb-2 relative w-full h-24 bg-gray-100 rounded overflow-hidden">
                            <video src={assetUrl} controls className="w-full h-full object-cover" />
                          </div>
                        )}

                        {/* AI 素材显示提示词输入框 */}
                        {isAiAsset && (
                          <textarea
                            value={assetPrompt || ''}
                            onChange={(e) => handleAssetChange(i, 'prompt', e.target.value)}
                            className="w-full p-2 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-purple-500 resize-none h-16"
                            placeholder="输入 AI 生成提示词..."
                          />
                        )}

                        {/* 静态素材显示 URL 或无文件提示 */}
                        {isStaticAsset && !assetUrl && (
                          <div
                            className="text-xs text-gray-400 text-center py-4 border-2 border-dashed border-gray-200 rounded cursor-pointer hover:border-blue-400 hover:text-blue-400"
                            onClick={() => triggerUpload(i, isImage ? 'image/*' : isAudio ? 'audio/*' : 'video/*')}
                          >
                            点击上传文件
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-xs text-gray-400 italic text-center py-2">暂无素材</div>
                )}
              </div>
            </div>
          </>
        )}

        {selectedEdge && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">选项文本</label>
              <input
                type="text"
                value={selectedEdge.label as string || ''}
                onChange={(e) => onEdgeChange(selectedEdge.id, { label: e.target.value })}
                className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">条件 (if)</label>
              <input
                type="text"
                value={selectedEdge.data?.condition as string || ''}
                onChange={(e) => onEdgeChange(selectedEdge.id, { data: { ...selectedEdge.data, condition: e.target.value } })}
                placeholder="例如: has_key == true"
                className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">状态更新 (set)</label>
              <input
                type="text"
                value={selectedEdge.data?.set as string || ''}
                onChange={(e) => onEdgeChange(selectedEdge.id, { data: { ...selectedEdge.data, set: e.target.value } })}
                placeholder="例如: gold = gold - 10"
                className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
