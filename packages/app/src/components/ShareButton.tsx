'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ShareNetworkIcon, CopyIcon, CheckIcon } from '@phosphor-icons/react';
import { Button, DropdownMenu } from '@radix-ui/themes';

interface ShareButtonProps {
  title: string;
  url: string;
  className?: string;
}

export default function ShareButton({ title, url, className = '' }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
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
        // 用户取消分享或不支持，继续使用下拉菜单
      }
    }
  };

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
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          <Button variant="ghost">
            <ShareNetworkIcon className="w-4 h-4" />
            {t('share')}
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item onClick={copyToClipboard}>
            {copied ? <CheckIcon className="w-4 h-4 text-green-500" /> : <CopyIcon className="w-4 h-4" />}
            {copied ? t('copied') : t('copyLink')}
          </DropdownMenu.Item>
          <DropdownMenu.Item onClick={shareToWeibo}>
            <span className="w-4 h-4 flex items-center justify-center text-red-500 font-bold">微</span>
            Weibo
          </DropdownMenu.Item>
          <DropdownMenu.Item onClick={shareToTwitter}>
            <span className="w-4 h-4 flex items-center justify-center">𝕏</span>
            TwitterLogoIcon
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>
  );
}
