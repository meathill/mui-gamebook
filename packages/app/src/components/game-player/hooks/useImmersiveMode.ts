import { useEffect } from 'react';

/**
 * enabled 为真时给 <html> 加 data-immersive="true"，转假或卸载时移除。
 * 用来让 globals.css 隐藏全站 header/footer 并锁掉页面滚动。
 *
 * 必须带开关：标题页（intro）不该锁滚动，也不该藏掉全站导航——
 * 只有真正进入游戏、由 fixed 全屏层接管画面时才需要沉浸式。
 */
export function useImmersiveMode(enabled: boolean) {
  useEffect(() => {
    if (typeof document === 'undefined' || !enabled) return;
    const root = document.documentElement;
    root.dataset.immersive = 'true';
    return () => {
      delete root.dataset.immersive;
    };
  }, [enabled]);
}
