import { useState, useRef, ChangeEvent } from 'react';
import { Node, Edge } from '@xyflow/react';
import { SceneNodeData } from '@/lib/editor/transformers';
import {
  CheckIcon,
  Trash2,
  ImageIcon,
  Loader2,
  Upload,
  Sparkles,
  Music,
  Video,
  Clock,
  Gamepad2,
  List,
} from 'lucide-react';
import { useParams } from 'next/navigation';
import { SceneNode } from '@mui-gamebook/parser';
import { useDialog } from '@/components/Dialog';
import MiniGameSelector from './MiniGameSelector';

interface InspectorProps {
  selectedNode: Node | null;
  selectedEdge: Edge | null;
  onNodeChange: (id: string, data: Partial<SceneNodeData>) => void;
  onNodeIdChange: (oldId: string, newId: string) => void;
  onEdgeChange: (id: string, changes: { label?: string; data?: Record<string, unknown> }) => void;
}

export default function Inspector({
  selectedNode,
  selectedEdge,
  onNodeChange,
  onNodeIdChange,
  onEdgeChange,
}: InspectorProps) {
  const { id } = useParams();
  const [generatingIndex, setGeneratingIndex] = useState<number>(-1);
  const [openGeneratorIndex, setOpenGeneratorIndex] = useState<number>(-1);
  const [uploadingIndex, setUploadingIndex] = useState<number>(-1);
  const [showMinigameSelector, setShowMinigameSelector] = useState<number>(-1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingUploadIndexRef = useRef<number>(-1);
  const pendingAssetsRef = useRef<SceneNode[] | null>(null);
  const dialog = useDialog();

  // Cast data for easier access
  const nodeData = selectedNode ? (selectedNode.data as unknown as SceneNodeData) : null;

  if (!selectedNode && !selectedEdge) {
    return (
      <div className="w-80 border-l border-gray-200 bg-white p-4 text-sm text-gray-500 hidden md:block">
        选择一个节点或边来编辑属性。
      </div>
    );
  }

  const handleAssetChange = (index: number, field: string, value: string) => {
    if (!selectedNode || !nodeData) return;
    const newAssets = [...(nodeData.assets || [])];
    newAssets[index] = { ...newAssets[index], [field]: value };
    onNodeChange(selectedNode.id, { assets: newAssets });
  };

  const handleAssetDelete = (index: number) => {
    if (!selectedNode || !nodeData) return;
    const newAssets = [...(nodeData.assets || [])];
    newAssets.splice(index, 1);
    onNodeChange(selectedNode.id, { assets: newAssets });
  };

  // 添加空白素材（统一入口，支持上传和 AI 生成）
  const handleAddAsset = (mediaType: 'image' | 'audio' | 'video' | 'minigame') => {
    if (!selectedNode || !nodeData) return;
    const newAssets = [...(nodeData.assets || [])];
    // 使用 AI 类型，因为它同时支持 prompt 和 url
    if (mediaType === 'audio') {
      newAssets.push({ type: 'ai_audio', prompt: '', audioType: 'sfx' });
    } else if (mediaType === 'minigame') {
      newAssets.push({ type: 'minigame', prompt: '', variables: {} });
    } else {
      newAssets.push({ type: `ai_${mediaType}` as 'ai_image' | 'ai_video', prompt: '' });
    }
    onNodeChange(selectedNode.id, { assets: newAssets });
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
        if (newAssets[index]) {
          newAssets[index] = { ...newAssets[index], url: data.url } as SceneNode;
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
      setUploadingIndex(-1);
    }
  };

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    console.log('[Inspector] handleFileSelect triggered', {
      files: e.target.files,
      pendingIndex: pendingUploadIndexRef.current,
    });
    const file = e.target.files?.[0];
    if (file && pendingUploadIndexRef.current !== null) {
      console.log('[Inspector] Calling handleUpload with file:', file.name);
      await handleUpload(file, pendingUploadIndexRef.current);
    } else {
      console.log('[Inspector] No file or pendingIndex is null');
    }
    pendingUploadIndexRef.current = -1;
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
    if (!('prompt' in asset) || !asset.prompt || !id) return;
    setGeneratingIndex(index);

    // 确定媒体类型
    const isMinigame = asset.type === 'minigame';
    const mediaType = isMinigame
      ? 'minigame'
      : asset.type.includes('image')
        ? 'image'
        : asset.type.includes('audio')
          ? 'audio'
          : 'video';
    // API 需要 ai_ 类型
    const apiType = isMinigame ? 'minigame' : `ai_${mediaType}`;

    try {
      // 小游戏生成
      if (isMinigame) {
        const variables = 'variables' in asset ? asset.variables : undefined;
        const res = await fetch('/api/cms/minigames', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: asset.prompt,
            variables,
          }),
        });

        if (!res.ok) {
          const error = (await res.json()) as { error: string };
          await dialog.error(`生成失败：${error.error}`);
          return;
        }

        const data = (await res.json()) as { id: number; url: string; name: string };
        handleAssetChange(index, 'url', data.url);
        await dialog.alert('小游戏生成成功！');
      } else if (mediaType === 'video') {
        // 视频使用异步生成
        const res = await fetch('/api/cms/assets/generate-async', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: asset.prompt,
            gameId: id,
            type: apiType,
          }),
        });

        if (!res.ok) {
          const error = (await res.json()) as { error: string };
          await dialog.error(`生成失败：${error.error}`);
          return;
        }

        const data = (await res.json()) as { url: string; operationId: number };
        // 设置占位符 URL，后续会轮询更新
        handleAssetChange(index, 'url', data.url);
        await dialog.alert('视频生成已启动，请稍等几分钟。生成完成后会自动更新。');
      } else {
        // 图片和音频使用同步生成
        const res = await fetch('/api/cms/assets/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: asset.prompt,
            gameId: id,
            type: apiType,
          }),
        });

        if (!res.ok) {
          const error = (await res.json()) as { error: string };
          await dialog.error(`生成失败：${error.error}`);
          return;
        }

        const data = (await res.json()) as { url: string };
        handleAssetChange(index, 'url', data.url);
      }
    } catch (e: unknown) {
      await dialog.error(`错误：${(e as Error).message}`);
    } finally {
      setGeneratingIndex(-1);
    }
  };

  return (
    <div className="w-80 border-l border-gray-200 bg-white flex flex-col overflow-y-auto z-20">
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
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
                  <button
                    onClick={() => handleAddAsset('image')}
                    className="p-1 text-blue-600 hover:bg-blue-50 rounded flex items-center gap-0.5"
                    title="添加图片">
                    <ImageIcon size={14} />
                    <span className="text-xs">图片</span>
                  </button>
                  <button
                    onClick={() => handleAddAsset('audio')}
                    className="p-1 text-blue-600 hover:bg-blue-50 rounded flex items-center gap-0.5"
                    title="添加音频">
                    <Music size={14} />
                    <span className="text-xs">音频</span>
                  </button>
                  <button
                    onClick={() => handleAddAsset('video')}
                    className="p-1 text-blue-600 hover:bg-blue-50 rounded flex items-center gap-0.5"
                    title="添加视频">
                    <Video size={14} />
                    <span className="text-xs">视频</span>
                  </button>
                  <button
                    onClick={() => handleAddAsset('minigame')}
                    className="p-1 text-purple-600 hover:bg-purple-50 rounded flex items-center gap-0.5"
                    title="添加小游戏">
                    <Gamepad2 size={14} />
                    <span className="text-xs">小游戏</span>
                  </button>
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
                    const assetUrl = 'url' in asset ? asset.url : undefined;
                    const assetPrompt = 'prompt' in asset ? asset.prompt : undefined;
                    const isImage = asset.type.includes('image');
                    const isAudio = asset.type.includes('audio');
                    const isVideo = asset.type.includes('video');
                    const isMinigame = asset.type === 'minigame';

                    return (
                      <div
                        key={i}
                        className="p-3 bg-gray-50 rounded border border-gray-200 text-sm relative group">
                        <div className="flex items-center gap-1 mb-2">
                          {isImage && (
                            <ImageIcon
                              size={16}
                              className="text-gray-500"
                            />
                          )}
                          {isMinigame && (
                            <Gamepad2
                              size={16}
                              className="text-purple-500"
                            />
                          )}
                          <span className="font-bold uppercase text-xs">
                            {asset.type.replace('ai_', '').replace('static_', '')}
                          </span>
                          <div className="flex gap-1 ms-auto">
                            {/* 小游戏不支持上传，但支持从已有列表选择 */}
                            {isMinigame && (
                              <button
                                onClick={() => setShowMinigameSelector(showMinigameSelector === i ? -1 : i)}
                                className="p-1 text-xs text-blue-600 rounded hover:bg-blue-100 flex items-center justify-center"
                                title="选择已有小游戏"
                                type="button">
                                <List size={14} />
                              </button>
                            )}
                            {!isMinigame && (
                              <button
                                onClick={() => triggerUpload(i, isImage ? 'image/*' : isAudio ? 'audio/*' : 'video/*')}
                                disabled={uploadingIndex === i}
                                className="p-1 text-xs rounded disabled:text-gray-300 hover:bg-blue-100 flex items-center justify-center"
                                title="上传素材"
                                type="button">
                                {uploadingIndex === i ? (
                                  <>
                                    <Loader2
                                      size={14}
                                      className="animate-spin"
                                    />
                                    <span className="sr-only">上传中...</span>
                                  </>
                                ) : (
                                  <>
                                    <Upload size={14} />
                                    <span className="sr-only">上传</span>
                                  </>
                                )}
                              </button>
                            )}
                            <button
                              className="p-1 text-xs text-purple-600  rounded hover:bg-purple-100 disabled:text-purple-300 flex items-center justify-center"
                              disabled={generatingIndex > -1}
                              onClick={() => setOpenGeneratorIndex(i === openGeneratorIndex ? -1 : i)}
                              title="AI 生成素材"
                              type="button">
                              <Sparkles size={14} />
                            </button>
                            <button
                              onClick={() => handleAssetDelete(i)}
                              className="p-1 text-red-600 hover:text-red-500 hover:bg-red-100"
                              title="删除素材">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* 小游戏选择器 */}
                        {isMinigame && showMinigameSelector === i && (
                          <div className="mb-2">
                            <MiniGameSelector
                              onSelect={(mg) => {
                                handleAssetChange(i, 'url', `/api/cms/minigames/${mg.id}`);
                                setShowMinigameSelector(-1);
                              }}
                              onGenerate={() => {
                                setShowMinigameSelector(-1);
                                setOpenGeneratorIndex(i);
                              }}
                              isGenerating={generatingIndex === i}
                            />
                          </div>
                        )}

                        {/* AI 生成区域 */}
                        {(openGeneratorIndex === i || (!assetUrl && assetPrompt)) && (
                          <div className="relative">
                            <textarea
                              value={assetPrompt || ''}
                              onChange={(e) => handleAssetChange(i, 'prompt', e.target.value)}
                              className="w-full p-2 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-purple-500 resize-none h-16 block"
                              placeholder="输入 AI 生成提示词..."
                            />
                            <button
                              className="size-6 bg-purple-600 text-white hover:bg-purple-500 absolute right-2 bottom-2 rounded flex items-center justify-center p-1"
                              disabled={generatingIndex === i || !assetPrompt}
                              onClick={() => handleRegenerate(i, asset)}
                              title="生成素材"
                              type="button">
                              {generatingIndex === i ? (
                                <>
                                  <Loader2
                                    size={16}
                                    className="animate-spin"
                                  />
                                  <span className="sr-only">生成中...</span>
                                </>
                              ) : (
                                <>
                                  <CheckIcon size={16} />
                                  <span className="sr-only">AI 生成</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}

                        {/* 预览区域 */}
                        {assetUrl && isImage && !assetUrl.startsWith('pending://') && (
                          <div className="mb-2 relative w-full h-24 bg-gray-100 rounded overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={assetUrl}
                              alt="预览"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        {assetUrl && isAudio && !assetUrl.startsWith('pending://') && (
                          <div className="mb-2">
                            <audio
                              src={assetUrl}
                              controls
                              className="w-full h-8"
                            />
                          </div>
                        )}
                        {assetUrl && isVideo && !assetUrl.startsWith('pending://') && (
                          <div className="mb-2 relative w-full h-24 bg-gray-100 rounded overflow-hidden">
                            <video
                              src={assetUrl}
                              controls
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        {/* 小游戏已生成状态 */}
                        {assetUrl && isMinigame && (
                          <div className="mb-2 relative w-full h-16 bg-purple-50 rounded overflow-hidden flex items-center justify-center border border-purple-200">
                            <div className="text-center">
                              <Gamepad2
                                size={20}
                                className="mx-auto text-purple-500"
                              />
                              <p className="text-xs text-purple-600 mt-1">小游戏已生成</p>
                            </div>
                          </div>
                        )}
                        {/* 待处理状态显示 */}
                        {assetUrl && assetUrl.startsWith('pending://') && (
                          <div className="mb-2 relative w-full h-24 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
                            <div className="text-center">
                              <Clock
                                size={24}
                                className="mx-auto text-gray-400 animate-pulse"
                              />
                              <p className="text-xs text-gray-500 mt-1">生成中...</p>
                            </div>
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
                value={(selectedEdge.label as string) || ''}
                onChange={(e) => onEdgeChange(selectedEdge.id, { label: e.target.value })}
                className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">条件 (if)</label>
              <input
                type="text"
                value={(selectedEdge.data?.condition as string) || ''}
                onChange={(e) =>
                  onEdgeChange(selectedEdge.id, { data: { ...selectedEdge.data, condition: e.target.value } })
                }
                placeholder="例如: has_key == true"
                className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">状态更新 (set)</label>
              <input
                type="text"
                value={(selectedEdge.data?.set as string) || ''}
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
