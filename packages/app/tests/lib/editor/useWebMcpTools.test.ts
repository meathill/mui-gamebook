import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WebMcpTool } from '@mui-gamebook/webmcp';
import { useWebMcpTools } from '@/lib/editor/useWebMcpTools';

const tool: WebMcpTool = {
  name: 'getScene',
  description: '读取场景',
  inputSchema: { type: 'object', properties: { sceneId: { type: 'string' } }, required: ['sceneId'] },
  readonly: true,
  annotations: { readOnlyHint: true, untrustedContentHint: true },
};

interface Registered {
  tool: WebMcpBrowserTool;
  options?: { signal?: AbortSignal };
}

function installModelContext() {
  const registered: Registered[] = [];
  const modelContext: WebMcpModelContext = {
    registerTool: vi.fn((registeredTool, options) => {
      registered.push({ tool: registeredTool, options });
      return Promise.resolve();
    }),
    unregisterTool: vi.fn(),
  };
  Object.defineProperty(document, 'modelContext', { value: modelContext, configurable: true });
  return { modelContext, registered };
}

describe('useWebMcpTools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete (document as { modelContext?: WebMcpModelContext }).modelContext;
  });

  it('把显式工具列表注册到 document.modelContext，并透传 annotations', () => {
    const { modelContext, registered } = installModelContext();
    const execute = vi.fn().mockReturnValue('scene-json');

    const { unmount } = renderHook(() => useWebMcpTools({ tools: [tool], execute }));

    expect(registered).toHaveLength(1);
    expect(registered[0].options?.signal).toBeInstanceOf(AbortSignal);
    expect(registered[0].tool).toMatchObject({
      name: 'getScene',
      description: '读取场景',
      inputSchema: tool.inputSchema,
      annotations: { readOnlyHint: true, untrustedContentHint: true },
    });

    unmount();
    expect(registered[0].options?.signal?.aborted).toBe(true);
    expect(modelContext.unregisterTool).toHaveBeenCalledWith('getScene');
  });

  it('execute 回调把工具名和参数交给宿主，并原样返回结果', async () => {
    const { registered } = installModelContext();
    const execute = vi.fn().mockImplementation((name, args) => `${name}:${args.sceneId}`);

    renderHook(() => useWebMcpTools({ tools: [tool], execute }));

    const result = await act(async () =>
      registered[0].tool.execute({ sceneId: 'start' }, { signal: new AbortController().signal }),
    );

    expect(execute).toHaveBeenCalledWith('getScene', { sceneId: 'start' });
    expect(result).toBe('getScene:start');
  });

  it('宿主抛错时返回失败文本，不让异常穿透到浏览器 Agent', async () => {
    const { registered } = installModelContext();
    const execute = vi.fn(() => {
      throw new Error('场景不存在');
    });

    renderHook(() => useWebMcpTools({ tools: [tool], execute }));

    const result = await act(async () =>
      registered[0].tool.execute({ sceneId: 'ghost' }, { signal: new AbortController().signal }),
    );

    expect(result).toBe('执行失败：场景不存在');
  });

  it('没有 modelContext 时静默跳过，不影响页面', () => {
    expect(() => renderHook(() => useWebMcpTools({ tools: [tool], execute: vi.fn() }))).not.toThrow();
  });

  it('只注册调用方传入的工具，不额外暴露全部只读工具', () => {
    const { registered } = installModelContext();
    const second: WebMcpTool = { ...tool, name: 'listScenes' };

    renderHook(() => useWebMcpTools({ tools: [tool, second], execute: vi.fn() }));

    expect(registered.map((item) => item.tool.name)).toEqual(['getScene', 'listScenes']);
  });
});
