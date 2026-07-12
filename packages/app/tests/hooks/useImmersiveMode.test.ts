import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useImmersiveMode } from '@/components/game-player/hooks/useImmersiveMode';

describe('useImmersiveMode', () => {
  afterEach(() => {
    delete document.documentElement.dataset.immersive;
  });

  it('挂载时给 <html> 添加 data-immersive="true"', () => {
    renderHook(() => useImmersiveMode());

    expect(document.documentElement.dataset.immersive).toBe('true');
  });

  it('卸载时移除 data-immersive 属性', () => {
    const { unmount } = renderHook(() => useImmersiveMode());

    unmount();

    expect(document.documentElement.dataset.immersive).toBeUndefined();
  });
});
