'use client';

import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import type { TextBoxPosition } from '@mui-gamebook/parser/src/types';
import { useTypewriter } from './hooks/useTypewriter';

interface ImmersiveTextBoxProps {
  /** 当前场景已显示到的所有段落，最后一段走逐字效果，前面几段静态显示 */
  paragraphs: string[];
  position: TextBoxPosition;
  speed?: number;
  showContinueHint: boolean;
  /** 点击任意处/按键：未打完则立刻打完，已打完则触发 onAdvance */
  onAdvance: () => void;
  children?: React.ReactNode;
}

const positionClasses: Record<TextBoxPosition, string> = {
  top: 'top-20 left-1/2 -translate-x-1/2',
  center: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
  bottom: 'bottom-8 left-1/2 -translate-x-1/2',
};

export default function ImmersiveTextBox({
  paragraphs,
  position,
  speed,
  showContinueHint,
  onAdvance,
  children,
}: ImmersiveTextBoxProps) {
  const currentText = paragraphs[paragraphs.length - 1] || '';
  const previousParagraphs = paragraphs.slice(0, -1);
  const { displayed, isComplete, complete } = useTypewriter(currentText, speed);
  const scrollRef = useRef<HTMLDivElement>(null);

  function handleAdvance() {
    if (!isComplete) {
      complete();
      return;
    }
    onAdvance();
  }

  // 新段落追加或逐字推进时，自动滚到底部
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [displayed, paragraphs.length]);

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
        ref={scrollRef}
        className={`absolute ${positionClasses[position]} w-[min(90vw,720px)] max-h-[70vh] overflow-y-auto px-6 py-5 rounded-2xl bg-black/60 backdrop-blur-md text-white shadow-2xl ring-1 ring-white/10`}>
        <div className="prose prose-invert max-w-none prose-p:my-2 text-lg leading-relaxed">
          {previousParagraphs.map((p, i) => (
            <div
              key={i}
              className="opacity-70">
              <ReactMarkdown>{p}</ReactMarkdown>
            </div>
          ))}
          <div>
            <ReactMarkdown>{displayed || '\u200b'}</ReactMarkdown>
          </div>
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
