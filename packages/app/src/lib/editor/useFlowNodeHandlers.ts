import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { addEdge, type Connection, type Edge, type Node, type useReactFlow } from '@xyflow/react';
import { getLayoutedElements } from '@/lib/editor/layout';
import { handleBatchFunctionCalls } from '@/lib/editor/chatFunctionHandlers';
import type { SceneNodeData } from '@/lib/editor/transformers';
import type { EditorGame } from '@/lib/editor/useEditorData';
import type { useDialog } from '@/components/Dialog';

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

  // AI function call 处理器
  const handleFunctionCall = useCallback(
    (calls: Array<{ name: string; args: Record<string, unknown> }>) => {
      handleBatchFunctionCalls(calls, {
        nodes: nodes as Node<SceneNodeData>[],
        edges,
        originalGame,
        setNodes,
        setEdges,
        setOriginalGame,
      });
    },
    [nodes, edges, originalGame, setNodes, setEdges, setOriginalGame],
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
