'use client';

import { useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import type { TextBoxPosition } from '@mui-gamebook/parser/src/types';
import { useTypewriter } from './hooks/useTypewriter';

interface ImmersiveTextBoxProps {
  text: string;
  position: TextBoxPosition;
  speed?: number;
  showContinueHint: boolean;
  /** 点击任意处/按键：未打完则立刻打完，已打完则触发 onAdvance */
  onAdvance: () => void;
  /** 只在段落完成且还有后续时显示 "继续" 提示 */
  children?: React.ReactNode;
}

const positionClasses: Record<TextBoxPosition, string> = {
  top: 'top-20 left-1/2 -translate-x-1/2',
  center: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
  bottom: 'bottom-8 left-1/2 -translate-x-1/2',
};

export default function ImmersiveTextBox({
  text,
  position,
  speed,
  showContinueHint,
  onAdvance,
  children,
}: ImmersiveTextBoxProps) {
  const { displayed, isComplete, complete } = useTypewriter(text, speed);

  function handleAdvance() {
    if (!isComplete) {
      complete();
      return;
    }
    onAdvance();
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') return;
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement | null)?.isContentEditable
      ) {
        return;
      }
      e.preventDefault();
      handleAdvance();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div
      onClick={handleAdvance}
      className="fixed inset-0 z-20 cursor-pointer select-none">
      <div
        className={`absolute ${positionClasses[position]} w-[min(90vw,720px)] max-h-[70vh] overflow-y-auto px-6 py-5 rounded-2xl bg-black/60 backdrop-blur-md text-white shadow-2xl ring-1 ring-white/10`}>
        <div className="prose prose-invert max-w-none prose-p:my-2 text-lg leading-relaxed">
          <ReactMarkdown>{displayed || '\u200b'}</ReactMarkdown>
        </div>
        {!isComplete && (
          <span
            className="inline-block w-2 h-5 ml-1 bg-white/80 align-middle animate-pulse"
            aria-hidden
          />
        )}
        {isComplete && showContinueHint && (
          <div className="mt-3 text-right text-xs text-white/70 animate-pulse">点击任意处继续 ▼</div>
        )}
        {children}
      </div>
    </div>
  );
}
