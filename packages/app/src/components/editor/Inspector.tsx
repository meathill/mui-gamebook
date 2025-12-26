import { useState } from 'react';
import type { Node, Edge } from '@xyflow/react';
import type { SceneNodeData } from '@/lib/editor/transformers';
import { Loader2, Volume2 } from 'lucide-react';
import { useParams } from 'next/navigation';
import type { SceneNode } from '@mui-gamebook/parser';
import type { GameState } from '@mui-gamebook/parser/src/types';
import { extractRuntimeState } from '@mui-gamebook/parser/src/utils';
import { interpolateVariables } from '@/lib/evaluator';
import { useDialog } from '@/components/Dialog';
import { useEditorStore } from '@/lib/editor/store';
import AssetEditor from './AssetEditor';
import type { AiConfig } from '@/lib/ai-prompt-builder';

interface InspectorProps {
  aiConfig?: AiConfig;
  initialState?: GameState;
  onNodeChange: (id: string, data: Partial<SceneNodeData>) => void;
  onNodeIdChange: (oldId: string, newId: string) => void;
  onEdgeChange: (id: string, changes: { label?: string; data?: Record<string, unknown> }) => void;
}

export default function Inspector({
  aiConfig,
  initialState,
  onNodeChange,
  onNodeIdChange,
  onEdgeChange,
}: InspectorProps) {
  const selectedNode = useEditorStore((s) => s.selectedNode);
  const selectedEdge = useEditorStore((s) => s.selectedEdge);
  const { id } = useParams();
  const [generatingTTS, setGeneratingTTS] = useState(false);
  const [generatingEdgeTTS, setGeneratingEdgeTTS] = useState(false);
  const dialog = useDialog();

  const nodeData = selectedNode ? (selectedNode.data as unknown as SceneNodeData) : null;

  if (!selectedNode && !selectedEdge) {
    return (
      <div className="w-80 border-l border-gray-200 bg-white p-4 text-sm text-gray-500 hidden md:block">
        选择一个节点或边来编辑属性。
      </div>
    );
  }

  function handleAssetsChange(assets: SceneNode[]) {
    if (!selectedNode) return;
    onNodeChange(selectedNode.id, { assets });
  }

  async function handleGenerateTTS() {
    if (!nodeData?.content || !id || !selectedNode) return;
    setGeneratingTTS(true);
    try {
      // 使用初始状态替换变量，避免 TTS 朗读变量名
      const runtimeState = initialState ? extractRuntimeState(initialState) : {};
      const processedText = interpolateVariables(nodeData.content, runtimeState);

      const res = await fetch('/api/cms/assets/generate-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: processedText, gameId: id }),
      });
      if (!res.ok) {
        const error = (await res.json()) as { error: string };
        await dialog.error(`TTS 生成失败：${error.error}`);
        return;
      }
      const data = (await res.json()) as { url: string };
      onNodeChange(selectedNode.id, { audio_url: data.url });
      await dialog.alert('语音生成成功！');
    } catch (e) {
      await dialog.error(`错误：${(e as Error).message}`);
    } finally {
      setGeneratingTTS(false);
    }
  }

  async function handleGenerateEdgeTTS() {
    if (!selectedEdge?.label || !id) return;
    setGeneratingEdgeTTS(true);
    try {
      const res = await fetch('/api/cms/assets/generate-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: selectedEdge.label as string, gameId: id }),
      });
      if (!res.ok) {
        const error = (await res.json()) as { error: string };
        await dialog.error(`TTS 生成失败：${error.error}`);
        return;
      }
      const data = (await res.json()) as { url: string };
      onEdgeChange(selectedEdge.id, { data: { ...selectedEdge.data, audio_url: data.url } });
      await dialog.alert('选项语音生成成功！');
    } catch (e) {
      await dialog.error(`错误：${(e as Error).message}`);
    } finally {
      setGeneratingEdgeTTS(false);
    }
  }

  return (
    <div className="w-80 h-[calc(100vh-12rem)] border-l border-gray-200 bg-white flex flex-col overflow-hidden z-20">
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between shrink-0">
        <h2 className="font-semibold text-gray-700">属性</h2>
        <p className="text-xs text-gray-500 truncate">
          {selectedNode ? `场景：${nodeData?.label}` : `选项：${selectedEdge?.label || '未命名'}`}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
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
              {nodeData.content && (
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={handleGenerateTTS}
                    disabled={generatingTTS}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs bg-purple-50 text-purple-600 rounded hover:bg-purple-100 disabled:opacity-50"
                    title="为内容生成语音">
                    {generatingTTS ? (
                      <Loader2
                        size={14}
                        className="animate-spin"
                      />
                    ) : (
                      <Volume2 size={14} />
                    )}
                    <span>生成语音</span>
                  </button>
                  {(nodeData.audio_url as string | undefined) && (
                    <audio
                      src={nodeData.audio_url as string}
                      controls
                      className="h-8 flex-1"
                    />
                  )}
                </div>
              )}
            </div>

            <AssetEditor
              gameId={id as string}
              assets={nodeData.assets || []}
              aiConfig={aiConfig}
              onAssetsChange={handleAssetsChange}
            />
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
              {selectedEdge.label && (
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={handleGenerateEdgeTTS}
                    disabled={generatingEdgeTTS}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs bg-purple-50 text-purple-600 rounded hover:bg-purple-100 disabled:opacity-50"
                    title="为选项生成语音">
                    {generatingEdgeTTS ? (
                      <Loader2
                        size={14}
                        className="animate-spin"
                      />
                    ) : (
                      <Volume2 size={14} />
                    )}
                    <span>生成语音</span>
                  </button>
                  {selectedEdge.data?.audio_url ? (
                    <audio
                      src={selectedEdge.data.audio_url as string}
                      controls
                      className="h-8 flex-1"
                    />
                  ) : null}
                </div>
              )}
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
