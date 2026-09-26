'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

interface ReviewDialogProps {
  open: boolean;
  rating: number;
  submitting: boolean;
  loginRequired: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (content: string) => void;
}

/**
 * 打分后的留言弹窗：可选写详细评价，未登录写评价时提示去登录
 */
export default function ReviewDialog({ open, rating, submitting, loginRequired, error, onClose, onSubmit }: ReviewDialogProps) {
  const t = useTranslations('game');
  const [content, setContent] = useState('');

  if (!open) return null;

  function handleSubmit() {
    onSubmit(content.trim());
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t('writeReview')}
      onClick={onClose}>
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 text-left"
        onClick={(e) => e.stopPropagation()}>
        <h3 className="font-semibold text-gray-900 text-lg mb-1">{t('writeReview')}</h3>
        <p className="text-sm text-gray-500 mb-4">{t('alreadyRated', { stars: rating })}</p>
        {loginRequired ? (
          <div className="text-center py-4">
            <p className="text-sm text-gray-600 mb-4">{t('loginToReview')}</p>
            <Link
              href="/sign-in"
              className="inline-block px-6 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-full font-medium">
              {t('goToLogin')}
            </Link>
          </div>
        ) : (
          <>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t('reviewPlaceholder')}
              rows={4}
              maxLength={500}
              className="w-full rounded-xl border border-gray-300 p-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-orange-400 focus:outline-none resize-none"
            />
            {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
            <div className="flex gap-3 justify-end mt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 text-sm text-gray-500 hover:text-gray-800">
                {t('skipReview')}
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="px-5 py-2 text-sm bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-full font-medium disabled:opacity-50">
                {t('submitReview')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
