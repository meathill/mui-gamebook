'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Share2, Copy, Check } from 'lucide-react';

interface ShareButtonProps {
  title: string;
  url: string;
  className?: string;
}

export default function ShareButton({ title, url, className = '' }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const t = useTranslations('share');
  const tHeader = useTranslations('header');

  const handleShare = async () => {
    // 尝试使用原生分享 API
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${title} | ${tHeader('title')}`,
          text: t('shareTitle', { title }),
          url,
        });
        return;
      } catch {
        // 用户取消分享或不支持
      }
    }
    // 回退到显示菜单
    setShowMenu(!showMenu);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setShowMenu(false);
      }, 2000);
    } catch {
      // 复制失败
    }
  };

  const shareToWeibo = () => {
    const weiboUrl = `https://service.weibo.com/share/share.php?url=${encodeURIComponent(url)}&title=${encodeURIComponent(t('shareTitle', { title }))}`;
    window.open(weiboUrl, '_blank', 'width=600,height=400');
    setShowMenu(false);
  };

  const shareToTwitter = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(t('shareTitle', { title }))}`;
    window.open(twitterUrl, '_blank', 'width=600,height=400');
    setShowMenu(false);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={handleShare}
        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        title={t('share')}>
        <Share2 className="w-4 h-4" />
        <span>{t('share')}</span>
      </button>

      {showMenu && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-10">
          <button
            onClick={copyToClipboard}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            {copied ? t('copied') : t('copyLink')}
          </button>
          <button
            onClick={shareToWeibo}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
            <span className="w-4 h-4 flex items-center justify-center text-red-500 font-bold">微</span>
            Weibo
          </button>
          <button
            onClick={shareToTwitter}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
            <span className="w-4 h-4 flex items-center justify-center">𝕏</span>
            Twitter
          </button>
        </div>
      )}
    </div>
  );
}
