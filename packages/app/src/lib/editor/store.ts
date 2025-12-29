/**
 * 编辑器状态管理
 * 使用 Zustand 管理编辑器的全局状态
 * 使用 zundo 提供 undo/redo 功能
 */
import { create } from 'zustand';
import { temporal } from 'zundo';
import type { TemporalState } from 'zundo';
import type { Node, Edge } from '@xyflow/react';
import type { Game, GameState, AICharacter } from '@mui-gamebook/parser/src/types';
import type { SceneNodeData } from './transformers';
import type { Tab } from '@/components/editor/EditorToolbar';

interface EditorState {
  // 游戏数据
  game: Game | null;
  slug: string;
  textContent: string;

  // React Flow
  nodes: Node<SceneNodeData>[];
  edges: Edge[];

  // UI 状态
  activeTab: Tab;
  viewMode: 'visual' | 'text';
  chatOpen: boolean;
  showImporter: boolean;

  // 选中元素
  selectedNode: Node | null;
  selectedEdge: Edge | null;

  // 加载保存状态
  loading: boolean;
  saving: boolean;
  error: string | null;
}

interface EditorActions {
  // 游戏数据操作
  setGame: (game: Game | null) => void;
  updateGame: (updater: (game: Game) => Game) => void;
  setSlug: (slug: string) => void;
  setTextContent: (content: string) => void;

  // React Flow 操作
  setNodes: (nodes: Node<SceneNodeData>[] | ((prev: Node<SceneNodeData>[]) => Node<SceneNodeData>[])) => void;
  setEdges: (edges: Edge[] | ((prev: Edge[]) => Edge[])) => void;

  // UI 状态操作
  setActiveTab: (tab: Tab) => void;
  setViewMode: (mode: 'visual' | 'text') => void;
  setChatOpen: (open: boolean) => void;
  toggleChatOpen: () => void;
  setShowImporter: (show: boolean) => void;

  // 选中元素操作
  setSelectedNode: (node: Node | null) => void;
  setSelectedEdge: (edge: Edge | null) => void;

  // 加载保存状态操作
  setLoading: (loading: boolean) => void;
  setSaving: (saving: boolean) => void;
  setError: (error: string | null) => void;

  // 便捷方法
  updateGameState: (newState: GameState) => void;
  updateCharacters: (characters: Record<string, AICharacter>) => void;

  // 重置
  reset: () => void;
}

const initialState: EditorState = {
  game: null,
  slug: '',
  textContent: '',
  nodes: [],
  edges: [],
  activeTab: 'settings',
  viewMode: 'visual',
  chatOpen: false,
  showImporter: false,
  selectedNode: null,
  selectedEdge: null,
  loading: true,
  saving: false,
  error: null,
};

// 需要被 undo/redo 追踪的状态类型
type TrackedState = Pick<EditorState, 'game' | 'nodes' | 'edges' | 'textContent'>;

export const useEditorStore = create<EditorState & EditorActions>()(
  temporal(
    (set, get) => ({
      ...initialState,

      // 游戏数据操作
      setGame: (game) => set({ game }),
      updateGame: (updater) => {
        const { game } = get();
        if (game) {
          set({ game: updater(game) });
        }
      },
      setSlug: (slug) => set({ slug }),
      setTextContent: (textContent) => set({ textContent }),

      // React Flow 操作
      setNodes: (nodesOrUpdater) => {
        if (typeof nodesOrUpdater === 'function') {
          set((state) => ({ nodes: nodesOrUpdater(state.nodes) }));
        } else {
          set({ nodes: nodesOrUpdater });
        }
      },
      setEdges: (edgesOrUpdater) => {
        if (typeof edgesOrUpdater === 'function') {
          set((state) => ({ edges: edgesOrUpdater(state.edges) }));
        } else {
          set({ edges: edgesOrUpdater });
        }
      },

      // UI 状态操作
      setActiveTab: (activeTab) => set({ activeTab }),
      setViewMode: (viewMode) => set({ viewMode }),
      setChatOpen: (chatOpen) => set({ chatOpen }),
      toggleChatOpen: () => set((state) => ({ chatOpen: !state.chatOpen })),
      setShowImporter: (showImporter) => set({ showImporter }),

      // 选中元素操作
      setSelectedNode: (selectedNode) => set({ selectedNode }),
      setSelectedEdge: (selectedEdge) => set({ selectedEdge }),

      // 加载保存状态操作
      setLoading: (loading) => set({ loading }),
      setSaving: (saving) => set({ saving }),
      setError: (error) => set({ error }),

      // 便捷方法
      updateGameState: (newState) => {
        const { game } = get();
        if (game) {
          set({ game: { ...game, initialState: newState } });
        }
      },
      updateCharacters: (characters) => {
        const { game } = get();
        if (game) {
          set({ game: { ...game, ai: { ...game.ai, characters } } });
        }
      },

      // 重置
      reset: () => set(initialState),
    }),
    {
      // 只追踪需要 undo/redo 的状态（游戏数据），忽略 UI 状态
      partialize: (state): TrackedState => ({
        game: state.game,
        nodes: state.nodes,
        edges: state.edges,
        textContent: state.textContent,
      }),
      // 历史记录限制
      limit: 100,
    },
  ),
);

// 时间旅行 store 访问 hook（使用 useStoreWithEqualityFn 实现响应式订阅）
import { useStoreWithEqualityFn } from 'zustand/traditional';

export function useTemporalStore<T>(selector: (state: TemporalState<TrackedState>) => T): T {
  return useStoreWithEqualityFn(useEditorStore.temporal, selector);
}

// 选择器 hooks（用于优化渲染）
export const useGame = () => useEditorStore((state) => state.game);
export const useNodes = () => useEditorStore((state) => state.nodes);
export const useEdges = () => useEditorStore((state) => state.edges);
export const useActiveTab = () => useEditorStore((state) => state.activeTab);
export const useViewMode = () => useEditorStore((state) => state.viewMode);
export const useChatOpen = () => useEditorStore((state) => state.chatOpen);
export const useSelectedNode = () => useEditorStore((state) => state.selectedNode);
export const useSelectedEdge = () => useEditorStore((state) => state.selectedEdge);
