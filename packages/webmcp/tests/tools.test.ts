import { describe, expect, it } from 'vitest';
import {
  WEBMCP_OPERATION_PRIORITY,
  WEBMCP_TOOLS,
  getPlaybackTools,
  getReadonlyTools,
  getWritableTools,
  sortWebMcpCalls,
} from '../src/tools';

describe('WEBMCP_TOOLS 工具定义', () => {
  it('工具名无重复', () => {
    const names = WEBMCP_TOOLS.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('每个工具都有 description 和 object 形态的 inputSchema', () => {
    for (const tool of WEBMCP_TOOLS) {
      expect(tool.description.trim().length).toBeGreaterThan(0);
      expect(tool.inputSchema.type).toBe('object');
      expect(typeof tool.inputSchema.properties).toBe('object');
    }
  });

  it('required 里声明的字段必须在 properties 里存在', () => {
    for (const tool of WEBMCP_TOOLS) {
      for (const key of tool.inputSchema.required ?? []) {
        expect(tool.inputSchema.properties[key], `${tool.name} 缺少 required 字段 ${key}`).toBeDefined();
      }
    }
  });

  it('优先级表覆盖所有工具（只读工具为 0，其余按增/删/改分组）', () => {
    for (const tool of WEBMCP_TOOLS) {
      expect(WEBMCP_OPERATION_PRIORITY[tool.name], `${tool.name} 缺少优先级`).toBeDefined();
    }
  });

  it('读写分组不重不漏：getWritableTools + getReadonlyTools 等于全量', () => {
    const writable = getWritableTools();
    const readonly = getReadonlyTools();
    expect(writable.length + readonly.length).toBe(WEBMCP_TOOLS.length);
    const writableNames = new Set(writable.map((t) => t.name));
    for (const tool of readonly) {
      expect(writableNames.has(tool.name)).toBe(false);
    }
    // 只读工具：剧本全文/场景列表/场景详情/搜索/校验
    expect(readonly.map((t) => t.name).sort()).toEqual([
      'getDsl',
      'getScene',
      'listScenes',
      'searchScenes',
      'validateScript',
    ]);
  });

  it('播放页只暴露 getDsl/listScenes，不暴露场景详情等编辑器工具', () => {
    expect(
      getPlaybackTools()
        .map((t) => t.name)
        .sort(),
    ).toEqual(['getDsl', 'listScenes']);
  });

  it('只读工具带 readOnlyHint，破坏性写工具带 consequentialHint', () => {
    for (const tool of getReadonlyTools()) {
      expect(tool.annotations?.readOnlyHint, `${tool.name} 缺少 readOnlyHint`).toBe(true);
    }
    for (const name of ['deleteScene', 'deleteVariable', 'deleteCharacter', 'updateScene']) {
      const tool = WEBMCP_TOOLS.find((t) => t.name === name);
      expect(tool?.annotations?.consequentialHint, `${name} 缺少 consequentialHint`).toBe(true);
    }
  });
});

describe('sortWebMcpCalls', () => {
  it('按 添加 → 删除 → 更新 排序，与 chatbot 批量语义一致', () => {
    const order = sortWebMcpCalls([
      { name: 'updateSceneText' },
      { name: 'deleteScene' },
      { name: 'addScene' },
      { name: 'addChoice' },
      { name: 'updateChoice' },
      { name: 'deleteChoice' },
    ]);
    expect(order.map((c) => c.name)).toEqual([
      'addScene',
      'addChoice',
      'deleteScene',
      'deleteChoice',
      'updateSceneText',
      'updateChoice',
    ]);
  });

  it('未知工具名排最后（默认优先级 99），相同优先级保持原相对顺序', () => {
    const calls = [{ name: 'unknownTool' }, { name: 'updateScene' }, { name: 'unknownTool2' }];
    expect(sortWebMcpCalls(calls).map((c) => c.name)).toEqual(['updateScene', 'unknownTool', 'unknownTool2']);
  });

  it('不修改入参数组', () => {
    const calls = [{ name: 'updateScene' }, { name: 'addScene' }];
    sortWebMcpCalls(calls);
    expect(calls.map((c) => c.name)).toEqual(['updateScene', 'addScene']);
  });
});
