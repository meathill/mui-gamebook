import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { parse } from '@roudanio/parser';
import { useEditorData } from '@/lib/editor/useEditorData';

const dialog = vi.hoisted(() => ({ confirm: vi.fn(), success: vi.fn(), error: vi.fn() }));
vi.mock('@/components/Dialog', () => ({ useDialog: () => dialog }));
vi.mock('@/hooks/useAutoSave', () => ({ loadDraft: () => null, clearDraft: vi.fn() }));
vi.mock('@mui-gamebook/site-common/utils', () => ({ trackPublishStory: vi.fn() }));
const SOURCE =
  '---\ntitle: 保存测试\nstate:\n  health:\n    value: 1\n    trigger:\n      condition: "<= 0"\n      scene: end\n---\n\n# start\n\n```yaml\nimage:\n  prompt: 图\n  custom: keep\n```\n\n* [继续] -> end (timer: 10)\n\n# end\n\n结束';
beforeEach(() => {
  vi.clearAllMocks();
  const parsed = parse(SOURCE);
  if (!parsed.success) throw new Error(parsed.error);
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init?: RequestInit) => ({
      ok: true,
      json: async () =>
        init?.method === 'PUT'
          ? { slug: 'test' }
          : { ...parsed.data, content: SOURCE, slug: 'test', updatedAt: Date.now() / 1000 },
    })),
  );
});

describe('文本保存与快速表单兼容', () => {
  it('手动保存沿用最新文本，保留扩展字段和改名后的触发器', async () => {
    const setNodes = vi.fn();
    const { result } = renderHook(() => useEditorData({ id: 'test', setNodes }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    const latest = SOURCE.replaceAll('end', '终点').replace('[继续]', '[继续阅读]');
    act(() => result.current.setTextContent(latest));
    await act(async () => result.current.handleSave([], [], 'text', 'story'));
    const call = vi.mocked(fetch).mock.calls.find(([, init]) => init?.method === 'PUT')!;
    expect(JSON.parse(call[1]!.body as string).content).toBe(latest);
    expect(dialog.success).toHaveBeenCalled();
  });
});
