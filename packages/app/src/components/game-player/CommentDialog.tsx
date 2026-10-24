'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { ChatCircleIcon, XIcon } from '@phosphor-icons/react';
import Comment from '@/components/Comment';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

/**
 * 标题页评论入口：平时只渲染一个按钮，dialog 打开后才挂载 Comment
 * （评论组件会拉外部脚本 + 读浏览器语言，绝不在首屏预加载）。
 * 只在标题态渲染，进游戏即卸载，不需要 .play-extras 兜底。
 */
export default function CommentDialog({ postId }: { postId: string }) {
  const [open, setOpen] = useState(false);
  const t = useTranslations('game');
  const tCommon = useTranslations('common');

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-0 w-full py-8 text-center">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border border-gray-300 bg-white text-gray-700 text-sm font-medium shadow-sm hover:border-orange-400 hover:text-orange-600 transition-colors">
        <ChatCircleIcon size={18} />
        {t('comments')}
      </button>

      <Dialog
        open={open}
        onOpenChange={setOpen}>
        {open && (
          <DialogContent
            aria-describedby={undefined}
            showCloseButton={false}
            className="max-w-2xl gap-0 overflow-hidden p-0">
            <div className="flex items-center justify-between border-b px-5 py-3">
              <DialogTitle className="font-semibold">{t('comments')}</DialogTitle>
              <DialogPrimitive.Close
                type="button"
                className="flex size-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 focus-visible:outline-none"
                aria-label={tCommon('close')}>
                <XIcon size={18} />
              </DialogPrimitive.Close>
            </div>
            <div className="max-h-[80dvh] overflow-y-auto p-5">
              <Comment postId={postId} />
            </div>
          </DialogContent>
        )}
      </Dialog>
    </section>
  );
}
