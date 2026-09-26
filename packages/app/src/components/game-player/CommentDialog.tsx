'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChatCircleIcon, XIcon } from '@phosphor-icons/react';
import Comment from '@/components/Comment';

/**
 * 标题页评论入口：平时只渲染一个按钮，dialog 打开后才挂载 Comment
 * （评论组件会拉外部脚本 + 读浏览器语言，绝不在首屏预加载）。
 * 只在标题态渲染，进游戏即卸载，不需要 .play-extras 兜底。
 */
export default function CommentDialog({ postId }: { postId: string }) {
  const [open, setOpen] = useState(false);
  const t = useTranslations('game');
  const tCommon = useTranslations('common');

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-0 w-full py-8 text-center">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border border-gray-300 bg-white text-gray-700 text-sm font-medium shadow-sm hover:border-orange-400 hover:text-orange-600 transition-colors">
        <ChatCircleIcon size={18} />
        {t('comments')}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={t('comments')}
          onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-2xl max-h-[80dvh] bg-white rounded-2xl shadow-2xl overflow-y-auto text-left"
            onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b px-5 py-3 flex items-center justify-between rounded-t-2xl">
              <h3 className="font-semibold text-gray-900">{t('comments')}</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500"
                aria-label={tCommon('close')}>
                <XIcon size={18} />
              </button>
            </div>
            <div className="p-5">
              <Comment postId={postId} />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
