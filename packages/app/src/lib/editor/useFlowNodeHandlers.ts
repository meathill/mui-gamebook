import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { parse } from '@roudanio/parser';
import { addEdge, type Connection, type Edge, type Node, type useReactFlow } from '@xyflow/react';
import { getLayoutedElements } from '@/lib/editor/layout';
import {
  executeEditorToolBatch,
  type EditorDocument,
  type EditorToolBatchResult,
  type FunctionCall,
} from '@/lib/editor/chatFunctionHandlers';
import { failResult } from '@/lib/editor/handlers/types';
import { flowToGame, gameToFlow, type SceneNodeData } from '@/lib/editor/transformers';
import type { EditorGame } from '@/lib/editor/useEditorData';
import type { useDialog } from '@/components/Dialog';
import type { Tab } from '@/components/editor/EditorToolbar';

interface UseFlowNodeHandlersParams {
  nodes: Node[];
  edges: Edge[];
  setNodes: Dispatch<SetStateAction<Node[]>>;
  setEdges: Dispatch<SetStateAction<Edge[]>>;
  selectedNode: Node | null;
  setSelectedNode: (node: Node | null) => void;
  selectedEdge: Edge | null;
  setSelectedEdge: (edge: Edge | null) => void;
  originalGame: EditorGame | null;
  setOriginalGame: Dispatch<SetStateAction<EditorGame | null>>;
  activeTab: Tab;
  textContent: string;
  setTextContent: Dispatch<SetStateAction<string>>;
  screenToFlowPosition: ReturnType<typeof useReactFlow>['screenToFlowPosition'];
  fitView: ReturnType<typeof useReactFlow>['fitView'];
  dialog: ReturnType<typeof useDialog>;
}

/**
 * 流程图 tab 里 React Flow 节点/边操作的处理器：连线、编辑节点/边、
 * 新建场景、自动排版、AI function call 批量应用
 */
export function useFlowNodeHandlers({
  nodes,
  edges,
  setNodes,
  setEdges,
  selectedNode,
  setSelectedNode,
  selectedEdge,
  setSelectedEdge,
  originalGame,
  setOriginalGame,
  activeTab,
  textContent,
  setTextContent,
  screenToFlowPosition,
  fitView,
  dialog,
}: UseFlowNodeHandlersParams) {
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, type: 'default', label: 'Choice' }, eds)),
    [setEdges],
  );

  function handleNodeChange(nodeId: string, data: Partial<SceneNodeData>) {
    setNodes((nds) => nds.map((node) => (node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node)));
    if (selectedNode && selectedNode.id === nodeId) {
      setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, ...data } } as Node);
    }
  }

  async function handleNodeIdChange(oldId: string, newId: string) {
    if (!newId || oldId === newId) return;
    if (nodes.some((n) => n.id === newId)) {
      await dialog.alert(`场景 ID "${newId}" 已存在。`);
      return;
    }
    setNodes((nds) =>
      nds.map((node) => (node.id === oldId ? { ...node, id: newId, data: { ...node.data, label: newId } } : node)),
    );
    setEdges((eds) =>
      eds.map((edge) => {
        let u = false,
          s = edge.source,
          t = edge.target;
        if (s === oldId) {
          s = newId;
          u = true;
        }
        if (t === oldId) {
          t = newId;
          u = true;
        }
        return u ? { ...edge, source: s, target: t } : edge;
      }),
    );
  }

  function handleEdgeChange(edgeId: string, changes: { label?: string; data?: Record<string, unknown> }) {
    setEdges((eds) =>
      eds.map((edge) =>
        edge.id === edgeId
          ? {
              ...edge,
              ...(changes.label ? { label: changes.label } : {}),
              ...(changes.data ? { data: { ...edge.data, ...changes.data } } : {}),
            }
          : edge,
      ),
    );
    if (selectedEdge && selectedEdge.id === edgeId) {
      setSelectedEdge({
        ...selectedEdge,
        ...(changes.label ? { label: changes.label } : {}),
        ...(changes.data ? { data: { ...selectedEdge.data, ...changes.data } } : {}),
      } as Edge);
    }
  }

  function handleAddScene() {
    const sceneId = `scene_${Date.now().toString().slice(-4)}`;
    const newNode = {
      id: sceneId,
      position: screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 }),
      data: { label: sceneId, content: 'New scene content', assets: [] },
      type: 'scene',
    };
    setNodes((nds) => nds.concat(newNode));
  }

  const handleLayout = useCallback(() => {
    const { nodes: ln, edges: le } = getLayoutedElements(nodes, edges);
    setNodes([...ln]);
    setEdges([...le]);
    window.requestAnimationFrame(() => fitView());
  }, [nodes, edges, setNodes, setEdges, fitView]);

  /** 从当前编辑视图构建 AI 工具的工作副本 */
  function buildBaseDocument(): { document?: EditorDocument; error?: string } {
    if (!originalGame) return { error: '游戏数据未加载' };

    if (activeTab === 'story') {
      const parsed = parse(textContent);
      if (!parsed.success) {
        return { error: `当前剧本无法解析，AI 修改已取消：${parsed.error}` };
      }
      const flow = gameToFlow(parsed.data);
      return {
        document: {
          nodes: flow.nodes,
          edges: flow.edges,
          // 保留编辑器特有字段（storyPrompt 等），以文本解析结果覆盖剧本内容
          game: { ...originalGame, ...parsed.data },
        },
      };
    }

    const typedNodes = nodes as Node<SceneNodeData>[];
    return {
      document: {
        nodes: typedNodes,
        edges,
        game: flowToGame(typedNodes, edges, originalGame),
      },
    };
  }

  // AI function call 处理器：工作副本执行 + 单次提交
  const handleFunctionCall = useCallback(
    (calls: FunctionCall[], baseDocument?: EditorDocument): EditorToolBatchResult => {
      const base = baseDocument ? { document: baseDocument } : buildBaseDocument();
      if (!base.document) {
        const message = base.error ?? '无法构建编辑器状态';
        return {
          ok: false,
          changed: false,
          results: calls.map((call) => failResult(call.name, message)),
          dsl: textContent,
          error: message,
        };
      }

      const result = executeEditorToolBatch(calls, base.document);
      const nextDocument = result.document;
      if (result.ok && result.changed && nextDocument) {
        setNodes(() => nextDocument.nodes);
        setEdges(() => nextDocument.edges);
        setOriginalGame((prev) =>
          prev ? { ...prev, ...nextDocument.game, storyPrompt: prev.storyPrompt } : (nextDocument.game as EditorGame),
        );
        setTextContent(result.dsl);
      }
      return result;
    },
    [nodes, edges, originalGame, activeTab, textContent, setNodes, setEdges, setOriginalGame, setTextContent],
  );

  return {
    onConnect,
    handleNodeChange,
    handleNodeIdChange,
    handleEdgeChange,
    handleAddScene,
    handleLayout,
    handleFunctionCall,
  };
}
