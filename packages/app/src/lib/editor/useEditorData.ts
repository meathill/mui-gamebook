'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { parse, stringify } from '@mui-gamebook/parser';
import { gameToFlow, flowToGame, SceneNodeData } from '@/lib/editor/transformers';
import { pendingOperationsManager, isPlaceholderUrl, extractOperationId } from '@/lib/pending-operations-manager';
import { loadDraft, clearDraft } from '@/hooks/useAutoSave';
import { useDialog } from '@/components/Dialog';
import type { Game } from '@mui-gamebook/parser/src/types';
import type { SceneNode } from '@mui-gamebook/parser';
import type { Node, Edge } from '@xyflow/react';

// 扩展 Game 类型，添加编辑器特有的字段
export interface EditorGame extends Game {
  storyPrompt?: string;
}

interface UseEditorDataProps {
  id: string;
  setNodes: (fn: (nodes: Node[]) => Node[]) => void;
}

interface UseEditorDataReturn {
  originalGame: EditorGame | null;
  setOriginalGame: React.Dispatch<React.SetStateAction<EditorGame | null>>;
  slug: string;
  setSlug: React.Dispatch<React.SetStateAction<string>>;
  textContent: string;
  setTextContent: React.Dispatch<React.SetStateAction<string>>;
  loading: boolean;
  saving: boolean;
  error: string;
  handleSave: (nodes: Node[], edges: Edge[], viewMode: 'visual' | 'text', activeTab: string) => Promise<void>;
  /** 静默云端保存（自动保存用），不弹 dialog */
  cloudSave: (content: string, slug: string) => Promise<boolean>;
  handleGenerateAssets: () => Promise<void>;
  handleScriptImport: (
    script: string,
    setNodes: (nodes: Node[]) => void,
    setEdges: (edges: Edge[]) => void,
    viewMode: 'visual' | 'text',
    setViewMode: (mode: 'visual' | 'text') => void,
  ) => Promise<void>;
  initialFlow: { nodes: Node[]; edges: Edge[] } | null;
}

export function useEditorData({ id, setNodes }: UseEditorDataProps): UseEditorDataReturn {
  const dialog = useDialog();

  const [originalGame, setOriginalGame] = useState<EditorGame | null>(null);
  const [slug, setSlug] = useState('');
  const [textContent, setTextContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [initialFlow, setInitialFlow] = useState<{ nodes: Node[]; edges: Edge[] } | null>(null);

  const registeredOperationsRef = useRef<Set<number>>(new Set());

  // 处理 pending 操作完成的回调
  const handleOperationComplete = useCallback(
    (operationId: number, result: { status: 'completed' | 'failed'; url?: string; error?: string }) => {
      const pendingUrl = `pending://${operationId}`;

      setNodes((currentNodes) => {
        return currentNodes.map((node) => {
          const nodeData = node.data as SceneNodeData;
          if (!nodeData.assets) return node;

          const hasThisOperation = nodeData.assets.some(
            (asset: SceneNode) => 'url' in asset && asset.url === pendingUrl,
          );

          if (!hasThisOperation) return node;

          const newAssets = nodeData.assets.map((asset: SceneNode) => {
            if ('url' in asset && asset.url === pendingUrl) {
              if (result.status === 'completed' && result.url) {
                return { ...asset, url: result.url };
              } else {
                return { ...asset, url: undefined };
              }
            }
            return asset;
          });

          return { ...node, data: { ...nodeData, assets: newAssets } };
        });
      });

      if (result.status === 'failed') {
        dialog.error(`视频生成失败：${result.error || '未知错误'}`);
      }

      registeredOperationsRef.current.delete(operationId);
    },
    [setNodes, dialog],
  );

  // 加载游戏数据 + 草稿恢复检测
  useEffect(() => {
    if (!id) return;

    fetch(`/api/cms/games/${id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load game');
        const data = (await res.json()) as {
          content: string;
          slug: string;
          storyPrompt?: string;
          updatedAt: string | number;
        } & Game;

        // 检测本地草稿
        const draft = loadDraft(id);
        const cloudUpdatedAt =
          typeof data.updatedAt === 'string' ? new Date(data.updatedAt).getTime() : (data.updatedAt as number) * 1000; // 整数时间戳为秒级

        let contentToUse = data.content;

        if (draft && draft.content !== data.content && draft.savedAt > cloudUpdatedAt) {
          // 本地草稿比云端更新，提示用户
          const useLocal = await dialog.confirm(
            '检测到本地有未保存的草稿（比云端版本更新），是否恢复？选择"取消"将使用云端版本。',
            '恢复本地草稿？',
          );
          if (useLocal) {
            contentToUse = draft.content;
          } else {
            clearDraft(id);
          }
        } else if (draft) {
          // 草稿不比云端新，清理掉
          clearDraft(id);
        }

        const result = parse(contentToUse);
        if (result.success) {
          setOriginalGame({ ...result.data, ...data });
          setSlug(data.slug);
          setTextContent(contentToUse);
          const flow = gameToFlow(result.data);
          setInitialFlow(flow);
        } else {
          throw new Error(`Parse error: ${result.error}`);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  // 扫描节点中的 pending URL 并注册到管理器
  const scanAndRegisterPendingOperations = useCallback(
    (nodes: Node[]) => {
      nodes.forEach((node) => {
        const nodeData = node.data as SceneNodeData;
        if (!nodeData.assets) return;

        nodeData.assets.forEach((asset: SceneNode) => {
          if ('url' in asset && asset.url && isPlaceholderUrl(asset.url)) {
            const operationId = extractOperationId(asset.url);
            if (operationId && !registeredOperationsRef.current.has(operationId)) {
              registeredOperationsRef.current.add(operationId);
              pendingOperationsManager.register(operationId, handleOperationComplete);
            }
          }
        });
      });
    },
    [handleOperationComplete],
  );

  async function handleSave(
    nodes: Node[],
    edges: Edge[],
    viewMode: 'visual' | 'text',
    activeTab: string,
  ): Promise<void> {
    if (!originalGame) return;
    setSaving(true);

    try {
      let gameToSave = originalGame;

      if (activeTab === 'story') {
        if (viewMode === 'visual') {
          gameToSave = flowToGame(nodes as Node<SceneNodeData>[], edges, originalGame);
        } else {
          const result = parse(textContent);
          if (result.success) {
            gameToSave = { ...originalGame, scenes: result.data.scenes };
          } else {
            throw new Error(`Cannot save: Invalid Markdown. ${result.error}`);
          }
        }
      } else {
        if (viewMode === 'visual') {
          const contentGame = flowToGame(nodes as Node<SceneNodeData>[], edges, originalGame);
          gameToSave = { ...originalGame, scenes: contentGame.scenes };
        } else {
          const result = parse(textContent);
          if (result.success) {
            gameToSave = { ...originalGame, scenes: result.data.scenes };
          }
        }
      }

      const content = stringify(gameToSave);
      setTextContent(content);

      const res = await fetch(`/api/cms/games/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, slug }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || 'Failed to save');
      }
      const result = (await res.json()) as { slug?: string };
      if (result.slug) {
        setSlug(result.slug);
      }
      await dialog.success('保存成功！');
    } catch (err) {
      await dialog.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  /** 静默云端保存（自动保存用），不弹 dialog，返回是否成功 */
  async function cloudSave(contentToSave: string, slugToSave: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/cms/games/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: contentToSave, slug: slugToSave }),
      });
      if (!res.ok) return false;
      const result = (await res.json()) as { slug?: string };
      if (result.slug) {
        setSlug(result.slug);
      }
      return true;
    } catch {
      return false;
    }
  }

  async function handleGenerateAssets(): Promise<void> {
    const confirmed = await dialog.confirm('这将扫描所有节点并生成缺失的 AI 素材。可能需要一些时间，确定继续吗？');
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/cms/games/${id}/batch-generate-assets`, { method: 'POST' });
      const data = (await res.json()) as { updatedCount?: number; error?: string };
      if (res.ok) {
        await dialog.success(`成功生成 ${data.updatedCount} 个素材！页面即将刷新...`);
        window.location.reload();
      } else {
        throw new Error(data.error);
      }
    } catch (e) {
      await dialog.error(`素材生成失败：${(e as Error).message}`);
    }
  }

  async function handleScriptImport(
    script: string,
    setNodesCallback: (nodes: Node[]) => void,
    setEdgesCallback: (edges: Edge[]) => void,
    viewMode: 'visual' | 'text',
    setViewMode: (mode: 'visual' | 'text') => void,
  ): Promise<void> {
    const result = parse(script);
    if (result.success) {
      setOriginalGame((prev) => ({ ...prev, ...result.data }));
      setTextContent(script);
      const flow = gameToFlow(result.data);
      setNodesCallback(flow.nodes);
      setEdgesCallback(flow.edges);
      if (viewMode === 'text') {
        setViewMode('visual');
      }
    } else {
      await dialog.error(`导入的脚本无效：${result.error}`);
    }
  }

  return {
    originalGame,
    setOriginalGame,
    slug,
    setSlug,
    textContent,
    setTextContent,
    loading,
    saving,
    error,
    handleSave,
    cloudSave,
    handleGenerateAssets,
    handleScriptImport,
    initialFlow,
    scanAndRegisterPendingOperations,
  } as UseEditorDataReturn & { scanAndRegisterPendingOperations: (nodes: Node[]) => void };
}
