import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  handleChatFunctionCall,
  handleBatchFunctionCalls,
  cleanupInvalidEdges,
  FunctionCall,
} from '@/lib/editor/chatFunctionHandlers';
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
      // 先复制结果，避免返回相同引用时的数据丢失
      const newNodes = [...result];
      nodes.length = 0;
      nodes.push(...newNodes);
    }),
    setEdges: vi.fn((fn) => {
      const result = fn(edges);
      // 先复制结果，避免返回相同引用时的数据丢失
      const newEdges = [...result];
      edges.length = 0;
      edges.push(...newEdges);
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

    it('updateScene 对不存在的场景应跳过（不抛错）', () => {
      const ctx = createMockContext();
      const initialLength = ctx.nodes.length;
      const result = handleChatFunctionCall('updateScene', { sceneId: 'not_exist', content: '内容' }, ctx);

      // 现在的行为是跳过而不是返回错误
      expect(result).toBe('已更新场景 "not_exist"');
      // 节点应该不变（通过长度检查）
      expect(ctx.nodes.length).toBe(initialLength);
    });

    it('addScene 应该添加新场景', () => {
      const ctx = createMockContext();
      const initialLength = ctx.nodes.length;
      const result = handleChatFunctionCall('addScene', { sceneId: 'new_scene', content: '新场景内容' }, ctx);

      expect(result).toBe('已添加场景 "new_scene"');
      expect(ctx.nodes.length).toBe(initialLength + 1);
      expect(ctx.nodes[ctx.nodes.length - 1].id).toBe('new_scene');
    });

    it('addScene 对已存在的场景应跳过', () => {
      const ctx = createMockContext();
      const initialLength = ctx.nodes.length;
      handleChatFunctionCall('addScene', { sceneId: 'start', content: '内容' }, ctx);

      // 长度不变
      expect(ctx.nodes.length).toBe(initialLength);
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

  describe('细粒度场景操作', () => {
    it('updateSceneText 应该只更新场景文案', () => {
      const ctx = createMockContext();
      const result = handleChatFunctionCall('updateSceneText', { sceneId: 'start', text: '新文案' }, ctx);

      expect(result).toBe('已更新场景 "start" 的文案');
      expect(ctx.nodes[0].data.content).toBe('新文案');
    });

    it('updateSceneImagePrompt 应该更新图片 prompt', () => {
      const ctx = createMockContext();
      const result = handleChatFunctionCall(
        'updateSceneImagePrompt',
        { sceneId: 'start', imagePrompt: '一个美丽的森林' },
        ctx,
      );

      expect(result).toBe('已更新场景 "start" 的图片 prompt');
      const startNode = ctx.nodes.find((n) => n.id === 'start');
      expect(startNode?.data.assets).toContainEqual({ type: 'ai_image', prompt: '一个美丽的森林' });
    });

    it('updateSceneImagePrompt 应该更新已有的 ai_image prompt', () => {
      const ctx = createMockContext();
      // 先添加一个 ai_image
      ctx.nodes[0].data.assets = [{ type: 'ai_image', prompt: '旧 prompt' }];

      const result = handleChatFunctionCall(
        'updateSceneImagePrompt',
        { sceneId: 'start', imagePrompt: '新 prompt' },
        ctx,
      );

      expect(result).toBe('已更新场景 "start" 的图片 prompt');
      expect(ctx.nodes[0].data.assets).toHaveLength(1);
      expect(ctx.nodes[0].data.assets[0]).toMatchObject({ type: 'ai_image', prompt: '新 prompt' });
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

    it('addChoice 应该跳过完全相同的重复选项', () => {
      const ctx = createMockContext();
      // 初始状态有一条边: start -> scene_1, label: '继续'
      const initialLength = ctx.edges.length;

      // 尝试添加完全相同的选项
      const result = handleChatFunctionCall(
        'addChoice',
        { sceneId: 'start', text: '继续', targetSceneId: 'scene_1' },
        ctx,
      );

      expect(result).toBe('跳过重复选项 "继续"（场景 "start"）');
      expect(ctx.edges.length).toBe(initialLength); // 长度不变
    });

    it('addChoice 应该允许添加不同目标的相同文本选项', () => {
      const ctx = createMockContext();
      // 先添加一个新场景
      ctx.nodes.push({
        id: 'scene_2',
        position: { x: 200, y: 200 },
        data: { label: 'scene_2', content: '场景2', assets: [] },
        type: 'scene',
      });
      const initialLength = ctx.edges.length;

      // 添加相同文本但不同目标的选项
      const result = handleChatFunctionCall(
        'addChoice',
        { sceneId: 'start', text: '继续', targetSceneId: 'scene_2' },
        ctx,
      );

      expect(result).toBe('已为场景 "start" 添加选项 "继续"');
      expect(ctx.edges.length).toBe(initialLength + 1);
    });

    it('addChoice 应该允许添加相同目标但不同文本的选项', () => {
      const ctx = createMockContext();
      const initialLength = ctx.edges.length;

      // 添加不同文本的选项
      const result = handleChatFunctionCall(
        'addChoice',
        { sceneId: 'start', text: '前进', targetSceneId: 'scene_1' },
        ctx,
      );

      expect(result).toBe('已为场景 "start" 添加选项 "前进"');
      expect(ctx.edges.length).toBe(initialLength + 1);
    });

    it('addChoice 应该区分有条件和无条件的选项', () => {
      const ctx = createMockContext();
      const initialLength = ctx.edges.length;

      // 添加带条件的选项（原始选项无条件）
      const result = handleChatFunctionCall(
        'addChoice',
        { sceneId: 'start', text: '继续', targetSceneId: 'scene_1', condition: 'gold > 10' },
        ctx,
      );

      expect(result).toBe('已为场景 "start" 添加选项 "继续"');
      expect(ctx.edges.length).toBe(initialLength + 1);
    });
  });

  describe('细粒度选项操作', () => {
    it('updateChoiceText 应该只更新选项文本', () => {
      const ctx = createMockContext();
      const result = handleChatFunctionCall(
        'updateChoiceText',
        { sceneId: 'start', choiceIndex: 0, text: '新文本' },
        ctx,
      );

      expect(result).toBe('已更新场景 "start" 第 1 个选项的文本');
      expect(ctx.edges[0].label).toBe('新文本');
    });

    it('updateChoiceTarget 应该只更新选项目标', () => {
      const ctx = createMockContext();
      // 先添加另一个场景
      ctx.nodes.push({
        id: 'scene_2',
        position: { x: 200, y: 200 },
        data: { label: 'scene_2', content: '场景2', assets: [] },
        type: 'scene',
      });

      const result = handleChatFunctionCall(
        'updateChoiceTarget',
        { sceneId: 'start', choiceIndex: 0, targetSceneId: 'scene_2' },
        ctx,
      );

      expect(result).toBe('已更新场景 "start" 第 1 个选项的目标');
      expect(ctx.edges[0].target).toBe('scene_2');
    });

    it('updateChoiceCondition 应该只更新选项条件', () => {
      const ctx = createMockContext();
      const result = handleChatFunctionCall(
        'updateChoiceCondition',
        { sceneId: 'start', choiceIndex: 0, condition: 'gold > 50' },
        ctx,
      );

      expect(result).toBe('已更新场景 "start" 第 1 个选项的条件');
      expect(ctx.edges[0].data?.condition).toBe('gold > 50');
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

    it('addVariable 应该跳过已存在的变量', () => {
      const ctx = createMockContext();
      // gold 在 createMockContext 中已存在
      const result = handleChatFunctionCall('addVariable', { name: 'gold', value: '999' }, ctx);

      expect(result).toBe('跳过重复变量 "gold"（已存在）');
      // 原值不应被覆盖
      expect(ctx.originalGame.initialState.gold).toBe(100);
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

    it('addCharacter 应该跳过已存在的角色', () => {
      const ctx = createMockContext();
      // hero 在 createMockContext 中已存在
      const originalName = ctx.originalGame.ai.characters?.hero?.name;
      const result = handleChatFunctionCall('addCharacter', { id: 'hero', name: '新英雄', description: '新描述' }, ctx);

      expect(result).toBe('跳过重复角色 "新英雄"（ID "hero" 已存在）');
      // 原角色名不应被覆盖
      expect(ctx.originalGame.ai.characters?.hero?.name).toBe(originalName);
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

describe('handleBatchFunctionCalls', () => {
  it('应该按优先级排序执行：添加 > 删除 > 更新', () => {
    const ctx = createMockContext();
    const executionOrder: string[] = [];

    // Mock console.log to track execution order
    const originalLog = console.log;
    console.log = (...args) => {
      if (args[0] === '执行 AI 函数:') {
        executionOrder.push(args[1]);
      }
    };

    const calls: FunctionCall[] = [
      { name: 'updateScene', args: { sceneId: 'start', content: '更新' } },
      { name: 'deleteScene', args: { sceneId: 'scene_1' } },
      { name: 'addScene', args: { sceneId: 'new_scene', content: '新场景' } },
    ];

    handleBatchFunctionCalls(calls, ctx);

    console.log = originalLog;

    // 验证顺序：添加 > 删除 > 更新
    expect(executionOrder[0]).toBe('addScene');
    expect(executionOrder[1]).toBe('deleteScene');
    expect(executionOrder[2]).toBe('updateScene');
  });

  it('应该返回所有操作的结果', () => {
    const ctx = createMockContext();

    const calls: FunctionCall[] = [
      { name: 'addScene', args: { sceneId: 'new_scene', content: '新场景' } },
      { name: 'updateScene', args: { sceneId: 'start', content: '更新' } },
    ];

    const results = handleBatchFunctionCalls(calls, ctx);

    expect(results).toHaveLength(2);
    expect(results).toContain('已添加场景 "new_scene"');
    expect(results).toContain('已更新场景 "start"');
  });
});

describe('cleanupInvalidEdges', () => {
  it('应该删除指向不存在节点的边', () => {
    const ctx = createMockContext();
    // 添加一条指向不存在节点的边
    ctx.edges.push({
      id: 'invalid-edge',
      source: 'start',
      target: 'non_existent_scene',
      label: '无效边',
    });

    cleanupInvalidEdges(ctx);

    expect(ctx.edges.find((e) => e.id === 'invalid-edge')).toBeUndefined();
    expect(ctx.edges.find((e) => e.id === 'start-scene_1-0')).toBeDefined();
  });

  it('应该删除来源不存在的边', () => {
    const ctx = createMockContext();
    ctx.edges.push({
      id: 'invalid-source-edge',
      source: 'non_existent_source',
      target: 'scene_1',
      label: '来源无效',
    });

    cleanupInvalidEdges(ctx);

    expect(ctx.edges.find((e) => e.id === 'invalid-source-edge')).toBeUndefined();
  });

  it('不应该删除有效的边', () => {
    const ctx = createMockContext();
    const initialValidEdgesCount = ctx.edges.length;

    cleanupInvalidEdges(ctx);

    expect(ctx.edges.length).toBe(initialValidEdgesCount);
  });
});
