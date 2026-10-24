'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ShareNetworkIcon, CopyIcon, CheckIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ShareButtonProps {
  title: string;
  url: string;
  className?: string;
}

export default function ShareButton({ title, url, className = '' }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const t = useTranslations('share');
  const tHeader = useTranslations('header');

  async function handleShare() {
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
        // 用户取消分享或不支持，继续使用下拉菜单
      }
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      // 复制失败
    }
  };

  const shareToWeibo = () => {
    const weiboUrl = `https://service.weibo.com/share/share.php?url=${encodeURIComponent(url)}&title=${encodeURIComponent(t('shareTitle', { title }))}`;
    window.open(weiboUrl, '_blank', 'width=600,height=400');
  };

  const shareToTwitter = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(t('shareTitle', { title }))}`;
    window.open(twitterUrl, '_blank', 'width=600,height=400');
  };

  // 如果支持原生分享，直接显示按钮
  if ('share' in navigator) {
    return (
      <div className={className}>
        <Button
          variant="ghost"
          onClick={handleShare}>
          <ShareNetworkIcon className="w-4 h-4" />
          {t('share')}
        </Button>
      </div>
    );
  }

  // 否则显示下拉菜单
  return (
    <div className={className}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost">
            <ShareNetworkIcon className="w-4 h-4" />
            {t('share')}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="min-w-[160px]"
          sideOffset={5}
          align="end">
          <DropdownMenuItem onClick={copyToClipboard}>
            {copied ? <CheckIcon className="w-4 h-4 text-green-500" /> : <CopyIcon className="w-4 h-4" />}
            {copied ? t('copied') : t('copyLink')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={shareToWeibo}>
            <span className="flex h-4 w-4 items-center justify-center font-bold text-red-500">微</span>
            Weibo
          </DropdownMenuItem>
          <DropdownMenuItem onClick={shareToTwitter}>
            <span className="flex h-4 w-4 items-center justify-center">𝕏</span>X / Twitter
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
