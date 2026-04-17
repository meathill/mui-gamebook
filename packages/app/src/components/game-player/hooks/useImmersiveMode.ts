import { useEffect } from 'react';

/**
 * 挂载时给 <html> 加 data-immersive="true"，卸载时移除。
 * 用来让 globals.css 隐藏全站 header/footer。
 */
export function useImmersiveMode() {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.dataset.immersive = 'true';
    return () => {
      delete root.dataset.immersive;
    };
  }, []);
}
