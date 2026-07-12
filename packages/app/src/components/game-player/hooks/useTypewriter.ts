import { useEffect, useRef, useState } from 'react';

interface UseTypewriterResult {
  displayed: string;
  isComplete: boolean;
  complete: () => void;
  reset: () => void;
}

/**
 * 逐字输出 hook。
 * - text 变化时自动重置并开始输出
 * - complete() 立刻显示全部（不会触发 onTick）
 * - speed 单位是毫秒/字，默认 40
 * - onTick 在逐字输出的每一步（非 complete()）触发一次，可用于打字音效
 */
export function useTypewriter(text: string, speed = 40, onTick?: () => void): UseTypewriterResult {
  const [displayed, setDisplayed] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const indexRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;

  function clearTimer() {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  useEffect(() => {
    clearTimer();
    indexRef.current = 0;
    setDisplayed('');
    setIsComplete(false);

    if (!text) {
      setIsComplete(true);
      return;
    }

    const chars = Array.from(text);

    function step() {
      if (indexRef.current >= chars.length) {
        setIsComplete(true);
        return;
      }
      indexRef.current += 1;
      setDisplayed(chars.slice(0, indexRef.current).join(''));
      onTickRef.current?.();
      timerRef.current = window.setTimeout(step, speed);
    }

    timerRef.current = window.setTimeout(step, speed);

    return clearTimer;
  }, [text, speed]);

  function complete() {
    clearTimer();
    setDisplayed(text);
    setIsComplete(true);
  }

  function reset() {
    clearTimer();
    indexRef.current = 0;
    setDisplayed('');
    setIsComplete(false);
  }

  return { displayed, isComplete, complete, reset };
}
