'use client';

import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { EyeIcon, EyeSlashIcon } from '@phosphor-icons/react';
import type { TextBoxPosition } from '@roudanio/parser/src/types';
import { useTypewriter } from './hooks/useTypewriter';

interface ImmersiveTextBoxProps {
  /** 当前场景已显示到的所有段落，最后一段走逐字效果，前面几段静态显示 */
  paragraphs: string[];
  position: TextBoxPosition;
  speed?: number;
  showContinueHint: boolean;
  /** 点击任意处/按键：未打完则立刻打完，已打完则触发 onAdvance */
  onAdvance: () => void;
  /** 隐藏/显示文字按钮的文案，由上层按当前语言传入 */
  hideTextLabel: string;
  showTextLabel: string;
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
  hideTextLabel,
  showTextLabel,
  children,
}: ImmersiveTextBoxProps) {
  const currentText = paragraphs[paragraphs.length - 1] || '';
  const previousParagraphs = paragraphs.slice(0, -1);
  const { displayed, isComplete, complete } = useTypewriter(currentText, speed);
  const [textHidden, setTextHidden] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasChoices = Boolean(children);

  function handleAdvance() {
    // 文字隐藏时只恢复文字，不推进剧情，避免跳过文本
    if (textHidden) {
      setTextHidden(false);
      return;
    }
    if (!isComplete) {
      complete();
      return;
    }
    onAdvance();
  }

  // 新段落追加、逐字推进或选项展开时，把正文滚到底部
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [displayed, paragraphs.length, hasChoices]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') return;
      const target = e.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement &&
          (target.isContentEditable || Boolean(target.closest('button, a, [role="button"]'))))
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
        data-testid="textbox-card"
        className={`absolute ${positionClasses[position]} flex max-h-[70dvh] w-[min(90vw,720px)] flex-col gap-2 overflow-hidden rounded-2xl bg-black/60 px-6 py-5 text-white shadow-2xl ring-1 ring-white/10 backdrop-blur-md transition-opacity duration-300 sm:max-h-[70vh] ${
          textHidden ? 'pointer-events-none opacity-0' : ''
        }`}>
        <div
          ref={scrollRef}
          data-testid="textbox-scroll"
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
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
          {/* 选项与正文共用同一个滚动区，展开时整体滚到底部 */}
          {children && <div className="mt-3">{children}</div>}
        </div>
        {/* 光标与继续提示共用固定高度的一行，避免打字结束时卡片上下跳动 */}
        <div
          data-testid="textbox-status"
          className="flex h-4 shrink-0 items-center justify-end">
          {!isComplete ? (
            <span
              className="h-3 w-1.5 animate-pulse rounded-sm bg-white/80"
              aria-hidden
            />
          ) : showContinueHint ? (
            <span className="animate-pulse whitespace-nowrap text-xs text-white/70">点击任意处继续 ▼</span>
          ) : null}
        </div>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setTextHidden((prev) => !prev);
        }}
        aria-label={textHidden ? showTextLabel : hideTextLabel}
        aria-pressed={textHidden}
        className={`absolute top-4 right-4 z-30 inline-flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-black/50 text-sm text-white ring-1 ring-white/10 backdrop-blur-md transition hover:bg-black/70 ${
          textHidden ? 'px-3' : 'w-10'
        }`}>
        {textHidden ? (
          <>
            <EyeIcon size={18} />
            <span>{showTextLabel}</span>
          </>
        ) : (
          <EyeSlashIcon size={18} />
        )}
      </button>
    </div>
  );
}
