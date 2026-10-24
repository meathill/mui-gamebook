import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useEditorPersistence } from '@/lib/editor/use-editor-persistence';

afterEach(() => vi.unstubAllGlobals());

describe('编辑器条件保存', () => {
  it('手动和自动保存串行执行，后一次使用前一次返回的版本', async () => {
    const versions: number[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, options: RequestInit) => {
        const data = JSON.parse(String(options.body)) as { expectedRevision: number };
        versions.push(data.expectedRevision);
        return { ok: true, json: async () => ({ revision: data.expectedRevision + 1, slug: 'test' }) };
      }),
    );
    const { result } = renderHook(() => useEditorPersistence('1'));
    result.current.revisionRef.current = 3;
    await Promise.all([result.current.persist('one', 'test'), result.current.persist('two', 'test')]);
    expect(versions).toEqual([3, 4]);
    expect(result.current.revisionRef.current).toBe(5);
  });

  it('冲突保留原版本，不采用未读取过的云端版本重试覆盖', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 409, json: async () => ({ revision: 9 }) })),
    );
    const { result } = renderHook(() => useEditorPersistence('1'));
    result.current.revisionRef.current = 3;
    await expect(result.current.persist('local draft', 'test')).rejects.toThrow('本地修改已保留');
    expect(result.current.revisionRef.current).toBe(3);
  });
});
