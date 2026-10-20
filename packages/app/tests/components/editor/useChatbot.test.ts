import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Game } from '@roudanio/parser/src/types';
import type { EditorToolBatchResult } from '@/lib/editor/chatFunctionHandlers';
import { MAX_CHAT_TOOL_ROUNDS } from '@/lib/editor/chat-declarations';
import { useChatbot } from '@/components/editor/ChatPanel/useChatbot';

const game: Game = {
  slug: 'g',
  title: 'T',
  initialState: { gold: 1 },
  ai: { characters: {} },
  scenes: {},
};

function sseResponse(events: Array<Record<string, unknown>>) {
  const text = events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join('');
  const bytes = new TextEncoder().encode(text);
  let read = false;
  return {
    ok: true,
    body: {
      getReader: () => ({
        read: async () => {
          if (read) return { done: true, value: undefined };
          read = true;
          return { done: false, value: bytes };
        },
      }),
    },
    json: async () => ({}),
  };
}

function execution(overrides: Partial<EditorToolBatchResult> = {}): EditorToolBatchResult {
  return {
    ok: true,
    changed: true,
    dsl: 'updated-dsl',
    document: { nodes: [], edges: [], game },
    results: [{ id: 'call_1', name: 'addScene', ok: true, message: '已添加场景' }],
    ...overrides,
  };
}

describe('useChatbot 多轮工具闭环', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('首轮工具调用执行后，把结果带回模型并展示最终总结', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        sseResponse([
          { type: 'function_call', id: 'call_1', name: 'addScene', args: { sceneId: 'forest' } },
          { type: 'done' },
        ]),
      )
      .mockResolvedValueOnce(sseResponse([{ type: 'text', content: '已经加好了' }, { type: 'done' }]));
    vi.stubGlobal('fetch', fetchMock);
    const onFunctionCall = vi.fn().mockReturnValue(execution());

    const { result } = renderHook(() => useChatbot({ gameId: '1', onFunctionCall }));

    await act(async () => {
      await result.current.sendMessage('加一个森林场景', { dsl: 'initial-dsl' });
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstBody = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    const secondBody = JSON.parse(fetchMock.mock.calls[1][1].body as string);
    expect(firstBody.toolRounds).toEqual([]);
    expect(secondBody.toolRounds).toHaveLength(1);
    expect(secondBody.toolRounds[0].calls[0]).toMatchObject({ id: 'call_1', name: 'addScene' });
    expect(secondBody.toolRounds[0].results[0]).toMatchObject({ id: 'call_1', name: 'addScene', isError: false });
    expect(secondBody.context.dsl).toBe('updated-dsl');

    expect(result.current.messages.map((message) => message.kind ?? message.role)).toEqual([
      'text',
      'tool-round',
      'text',
    ]);
    expect(result.current.messages[1].toolResults?.[0]).toMatchObject({ name: 'addScene', ok: true });
    expect(result.current.messages[2].content).toBe('已经加好了');
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('工具失败结果以 isError 回传，模型可在下一轮修正', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        sseResponse([{ type: 'function_call', id: 'call_1', name: 'addChoice', args: {} }, { type: 'done' }]),
      )
      .mockResolvedValueOnce(sseResponse([{ type: 'text', content: '已修正' }, { type: 'done' }]));
    vi.stubGlobal('fetch', fetchMock);
    const onFunctionCall = vi.fn().mockReturnValue(
      execution({
        ok: false,
        changed: false,
        dsl: 'same-dsl',
        results: [{ id: 'call_1', name: 'addChoice', ok: false, message: '目标场景不存在' }],
        error: '校验失败',
      }),
    );

    const { result } = renderHook(() => useChatbot({ gameId: '1', onFunctionCall }));

    await act(async () => {
      await result.current.sendMessage('加个选项', { dsl: 'initial-dsl' });
    });

    const secondBody = JSON.parse(fetchMock.mock.calls[1][1].body as string);
    expect(secondBody.toolRounds[0].results[0].isError).toBe(true);
    expect(secondBody.toolRounds[0].results[0].content).toContain('目标场景不存在');
    expect(secondBody.context.dsl).toBe('same-dsl');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.current.messages[2].content).toBe('已修正');
  });

  it('达到工具轮次上限后停止执行并提示', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(
          sseResponse([
            { type: 'function_call', id: `call_${fetchMock.mock.calls.length}`, name: 'getDsl', args: {} },
            { type: 'done' },
          ]),
        ),
      );
    vi.stubGlobal('fetch', fetchMock);
    const onFunctionCall = vi.fn().mockReturnValue(
      execution({
        changed: false,
        results: [{ id: 'x', name: 'getDsl', ok: true, message: 'dsl' }],
      }),
    );

    const { result } = renderHook(() => useChatbot({ gameId: '1', onFunctionCall }));

    await act(async () => {
      await result.current.sendMessage('一直调用工具', { dsl: 'initial-dsl' });
    });

    expect(onFunctionCall).toHaveBeenCalledTimes(MAX_CHAT_TOOL_ROUNDS);
    expect(fetchMock).toHaveBeenCalledTimes(MAX_CHAT_TOOL_ROUNDS + 1);
    expect(result.current.error).toContain('轮次已达上限');
    expect(result.current.loading).toBe(false);
  });

  it('最终没有文本和工具调用时报告错误', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(sseResponse([{ type: 'done' }])));
    const { result } = renderHook(() => useChatbot({ gameId: '1', onFunctionCall: vi.fn() }));

    await act(async () => {
      await result.current.sendMessage('空响应', { dsl: 'initial-dsl' });
    });

    expect(result.current.error).toBe('无法获取 AI 响应');
  });
});
