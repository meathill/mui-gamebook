import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleChatFunctionCall } from '@/lib/editor/chatFunctionHandlers';
import type { Node, Edge } from '@xyflow/react';
import type { SceneNodeData } from '@/lib/editor/transformers';
import type { Game } from '@mui-gamebook/parser/src/types';

// 创建测试用的 mock 函数
function createMockContext() {
  const nodes: Node<SceneNodeData>[] = [
    {
      id: 'start',
      position: { x: 0, y: 0 },
      data: { label: 'start', content: '这是开始场景', assets: [] },
      type: 'scene',
    },
    {
      id: 'scene_1',
      position: { x: 100, y: 100 },
      data: { label: 'scene_1', content: '这是场景1', assets: [] },
      type: 'scene',
    },
  ];

  const edges: Edge[] = [
    {
      id: 'start-scene_1-0',
      source: 'start',
      target: 'scene_1',
      label: '继续',
      data: { condition: undefined, set: undefined },
    },
  ];

  const originalGame: Game = {
    title: '测试游戏',
    slug: 'test-game',
    initialState: {
      gold: 100,
      hasKey: false,
    },
    ai: {
      characters: {
        hero: { name: '英雄', description: '主角' },
      },
    },
    scenes: {},
  };

  return {
    nodes,
    edges,
    originalGame,
    setNodes: vi.fn((fn) => {
      const result = fn(nodes);
      nodes.length = 0;
      nodes.push(...result);
    }),
    setEdges: vi.fn((fn) => {
      const result = fn(edges);
      edges.length = 0;
      edges.push(...result);
    }),
    setOriginalGame: vi.fn((fn) => {
      if (typeof fn === 'function') {
        const result = fn(originalGame);
        if (result) Object.assign(originalGame, result);
      }
    }),
  };
}

describe('chatFunctionHandlers', () => {
  describe('场景操作', () => {
    it('updateScene 应该更新场景内容', () => {
      const ctx = createMockContext();
      const result = handleChatFunctionCall('updateScene', { sceneId: 'start', content: '新的开始场景内容' }, ctx);

      expect(result).toBe('已更新场景 "start"');
      expect(ctx.setNodes).toHaveBeenCalled();
      expect(ctx.nodes[0].data.content).toBe('新的开始场景内容');
    });

    it('updateScene 对不存在的场景应返回错误', () => {
      const ctx = createMockContext();
      const result = handleChatFunctionCall('updateScene', { sceneId: 'not_exist', content: '内容' }, ctx);

      expect(result).toBe('场景 "not_exist" 不存在');
    });

    it('addScene 应该添加新场景', () => {
      const ctx = createMockContext();
      const initialLength = ctx.nodes.length;
      const result = handleChatFunctionCall('addScene', { sceneId: 'new_scene', content: '新场景内容' }, ctx);

      expect(result).toBe('已添加场景 "new_scene"');
      expect(ctx.nodes.length).toBe(initialLength + 1);
      expect(ctx.nodes[ctx.nodes.length - 1].id).toBe('new_scene');
    });

    it('addScene 对已存在的场景应返回错误', () => {
      const ctx = createMockContext();
      const result = handleChatFunctionCall('addScene', { sceneId: 'start', content: '内容' }, ctx);

      expect(result).toBe('场景 "start" 已存在');
    });

    it('deleteScene 应该删除场景和相关边', () => {
      const ctx = createMockContext();
      const result = handleChatFunctionCall('deleteScene', { sceneId: 'scene_1' }, ctx);

      expect(result).toBe('已删除场景 "scene_1"');
      expect(ctx.nodes.find((n) => n.id === 'scene_1')).toBeUndefined();
      expect(ctx.edges.find((e) => e.target === 'scene_1')).toBeUndefined();
    });

    it('deleteScene 不能删除 start 场景', () => {
      const ctx = createMockContext();
      const result = handleChatFunctionCall('deleteScene', { sceneId: 'start' }, ctx);

      expect(result).toBe('不能删除 start 场景');
    });

    it('renameScene 应该重命名场景并更新边', () => {
      const ctx = createMockContext();
      const result = handleChatFunctionCall('renameScene', { oldId: 'scene_1', newId: 'renamed_scene' }, ctx);

      expect(result).toBe('已将场景 "scene_1" 重命名为 "renamed_scene"');
      expect(ctx.nodes.find((n) => n.id === 'renamed_scene')).toBeDefined();
      expect(ctx.edges[0].target).toBe('renamed_scene');
    });
  });

  describe('选项操作', () => {
    it('addChoice 应该添加新选项', () => {
      const ctx = createMockContext();
      const initialLength = ctx.edges.length;
      const result = handleChatFunctionCall(
        'addChoice',
        { sceneId: 'start', text: '新选项', targetSceneId: 'scene_1' },
        ctx,
      );

      expect(result).toBe('已为场景 "start" 添加选项 "新选项"');
      expect(ctx.edges.length).toBe(initialLength + 1);
    });

    it('updateChoice 应该更新选项文本', () => {
      const ctx = createMockContext();
      const result = handleChatFunctionCall(
        'updateChoice',
        { sceneId: 'start', choiceIndex: 0, text: '更新后的选项' },
        ctx,
      );

      expect(result).toBe('已更新场景 "start" 的第 1 个选项');
      expect(ctx.edges[0].label).toBe('更新后的选项');
    });

    it('deleteChoice 应该删除选项', () => {
      const ctx = createMockContext();
      const result = handleChatFunctionCall('deleteChoice', { sceneId: 'start', choiceIndex: 0 }, ctx);

      expect(result).toBe('已删除场景 "start" 的第 1 个选项');
      expect(ctx.edges.length).toBe(0);
    });
  });

  describe('变量操作', () => {
    it('addVariable 应该添加新变量', () => {
      const ctx = createMockContext();
      const result = handleChatFunctionCall('addVariable', { name: 'newVar', value: '10' }, ctx);

      expect(result).toBe('已添加变量 "newVar"');
      expect(ctx.setOriginalGame).toHaveBeenCalled();
    });

    it('updateVariable 应该更新变量值', () => {
      const ctx = createMockContext();
      const result = handleChatFunctionCall('updateVariable', { name: 'gold', value: '200' }, ctx);

      expect(result).toBe('已更新变量 "gold"');
    });

    it('updateVariable 对不存在的变量应返回错误', () => {
      const ctx = createMockContext();
      const result = handleChatFunctionCall('updateVariable', { name: 'notExist', value: '0' }, ctx);

      expect(result).toBe('变量 "notExist" 不存在');
    });

    it('deleteVariable 应该删除变量', () => {
      const ctx = createMockContext();
      const result = handleChatFunctionCall('deleteVariable', { name: 'gold' }, ctx);

      expect(result).toBe('已删除变量 "gold"');
    });
  });

  describe('角色操作', () => {
    it('addCharacter 应该添加新角色', () => {
      const ctx = createMockContext();
      const result = handleChatFunctionCall('addCharacter', { id: 'villain', name: '反派', description: '坏人' }, ctx);

      expect(result).toBe('已添加角色 "反派"');
    });

    it('updateCharacter 应该更新角色信息', () => {
      const ctx = createMockContext();
      const result = handleChatFunctionCall('updateCharacter', { id: 'hero', name: '勇者' }, ctx);

      expect(result).toBe('已更新角色 "英雄"');
    });

    it('updateCharacter 对不存在的角色应返回错误', () => {
      const ctx = createMockContext();
      const result = handleChatFunctionCall('updateCharacter', { id: 'notExist', name: 'x' }, ctx);

      expect(result).toBe('角色 "notExist" 不存在');
    });

    it('deleteCharacter 应该删除角色', () => {
      const ctx = createMockContext();
      const result = handleChatFunctionCall('deleteCharacter', { id: 'hero' }, ctx);

      expect(result).toBe('已删除角色 "英雄"');
    });
  });

  describe('未知函数', () => {
    it('应该返回未知函数错误', () => {
      const ctx = createMockContext();
      const result = handleChatFunctionCall('unknownFunction', {}, ctx);

      expect(result).toBe('未知的函数: unknownFunction');
    });
  });
});
