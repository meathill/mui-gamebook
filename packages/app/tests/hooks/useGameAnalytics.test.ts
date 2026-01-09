import { renderHook } from '@testing-library/react';
import { useGameAnalytics } from '../../src/hooks/useGameAnalytics';
import { vi, describe, it, expect, beforeEach } from 'vitest';

describe('useGameAnalytics', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    global.fetch = mockFetch;
  });

  it('trackOpen calls /api/analytics/open', async () => {
    const { result } = renderHook(() => useGameAnalytics());
    await result.current.trackOpen(123);

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/analytics/open',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ gameId: 123 }),
      }),
    );
  });

  it('trackScene calls /api/analytics/scene', async () => {
    const { result } = renderHook(() => useGameAnalytics());
    await result.current.trackScene(123, 'scene-1');

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/analytics/scene',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ gameId: 123, sceneId: 'scene-1' }),
      }),
    );
  });

  it('trackChoice calls /api/analytics/choice', async () => {
    const { result } = renderHook(() => useGameAnalytics());
    await result.current.trackChoice(123, 'scene-1', 0);

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/analytics/choice',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ gameId: 123, sceneId: 'scene-1', choiceIndex: 0 }),
      }),
    );
  });

  it('trackComplete calls /api/analytics/complete', async () => {
    const { result } = renderHook(() => useGameAnalytics());
    await result.current.trackComplete(123);

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/analytics/complete',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ gameId: 123 }),
      }),
    );
  });
});
