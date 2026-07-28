import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useImmersiveMode } from '@/components/game-player/hooks/useImmersiveMode';

describe('useImmersiveMode', () => {
  afterEach(() => {
    delete document.documentElement.dataset.immersive;
  });

  it('enabled 时给 <html> 添加 data-immersive="true"', () => {
    renderHook(() => useImmersiveMode(true));

    expect(document.documentElement.dataset.immersive).toBe('true');
  });

  it('卸载时移除 data-immersive 属性', () => {
    const { unmount } = renderHook(() => useImmersiveMode(true));

    unmount();

    expect(document.documentElement.dataset.immersive).toBeUndefined();
  });

  it('enabled 为 false 时不写属性（标题页不该锁滚动、不该藏导航）', () => {
    renderHook(() => useImmersiveMode(false));

    expect(document.documentElement.dataset.immersive).toBeUndefined();
  });

  it('由 true 切回 false 时移除属性', () => {
    const { rerender } = renderHook(({ enabled }) => useImmersiveMode(enabled), {
      initialProps: { enabled: true },
    });
    expect(document.documentElement.dataset.immersive).toBe('true');

    rerender({ enabled: false });

    expect(document.documentElement.dataset.immersive).toBeUndefined();
  });
});
