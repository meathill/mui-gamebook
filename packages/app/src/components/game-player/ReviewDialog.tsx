'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface ReviewDialogProps {
  open: boolean;
  rating: number;
  submitting: boolean;
  loginRequired: boolean;
  error: string | null;
  /** 登录前写的草稿，弹窗首次挂载时回填 */
  initialContent?: string;
  /** 去登录的跳转地址（带跳回） */
  loginHref?: string;
  onClose: () => void;
  onSubmit: (content: string) => void;
}

/**
 * 打分后的留言弹窗：可选写详细评价，未登录写评价时提示去登录
 */
export default function ReviewDialog({
  open,
  rating,
  submitting,
  loginRequired,
  error,
  initialContent = '',
  loginHref = '/sign-in',
  onClose,
  onSubmit,
}: ReviewDialogProps) {
  const t = useTranslations('game');
  const [content, setContent] = useState(initialContent);

  function handleSubmit() {
    onSubmit(content.trim());
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('writeReview')}</DialogTitle>
          <DialogDescription>{t('alreadyRated', { stars: rating })}</DialogDescription>
        </DialogHeader>
        {loginRequired ? (
          <div className="text-center py-4">
            <p className="text-muted-foreground mb-4 text-sm">{t('loginToReview')}</p>
            <Button asChild>
              <Link href={loginHref}>{t('goToLogin')}</Link>
            </Button>
          </div>
        ) : (
          <>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t('reviewPlaceholder')}
              rows={4}
              maxLength={500}
              className="resize-none"
            />
            {error && <p className="text-destructive mt-2 text-sm">{error}</p>}
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}>
                {t('skipReview')}
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}>
                {t('submitReview')}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
