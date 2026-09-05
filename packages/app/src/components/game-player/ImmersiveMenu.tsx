'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import type { TextBoxPosition } from '@mui-gamebook/parser/src/types';
import { ArrowCounterClockwiseIcon, CaretDownIcon, ChatIcon, HouseIcon } from '@phosphor-icons/react';
import Button from '@/components/Button';
import ShareButton from '@/components/ShareButton';

const POSITIONS: TextBoxPosition[] = ['bottom', 'center', 'top'];
const POSITION_LABEL: Record<TextBoxPosition, string> = {
  bottom: '底部',
  center: '居中',
  top: '顶部',
};

interface ImmersiveMenuProps {
  title: string;
  shareUrl: string;
  open: boolean;
  textPosition: TextBoxPosition;
  onToggle: () => void;
  onChangeTextPosition: (pos: TextBoxPosition) => void;
  onOpenComments: () => void;
  /** 回标题页，保留存档 */
  onBackToTitle: () => void;
  /** 清档重来，带确认 */
  onRestart: () => void;
}

/** 沉浸式播放器左上角的面包屑 + 下拉菜单 */
export default function ImmersiveMenu({
  title,
  shareUrl,
  open,
  textPosition,
  onToggle,
  onChangeTextPosition,
  onOpenComments,
  onBackToTitle,
  onRestart,
}: ImmersiveMenuProps) {
  const t = useTranslations('game');

  return (
    <div className="absolute top-4 left-4 z-40">
      <div className="inline-flex items-center gap-1 bg-black/50 backdrop-blur-md ring-1 ring-white/10 rounded-full pl-3 pr-1 py-1 text-sm text-white">
        <Link
          href="/"
          prefetch={false}
          className="text-white/70 hover:text-white transition">
          MuiStory
        </Link>
        <span className="text-white/30">›</span>
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-full hover:bg-white/10 transition font-medium"
          aria-haspopup="menu"
          aria-expanded={open}>
          <span className="max-w-[200px] truncate">{title}</span>
          <CaretDownIcon
            size={14}
            className={`transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>
      </div>
      {open && (
        <div className="absolute left-0 mt-2 w-64 bg-black/75 backdrop-blur-md rounded-xl ring-1 ring-white/10 p-3 shadow-2xl text-sm">
          <div className="text-xs uppercase tracking-wider text-white/50 mb-2">文字框位置</div>
          <div className="flex gap-1 mb-3">
            {POSITIONS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => onChangeTextPosition(p)}
                className={`flex-1 px-2 py-1 rounded text-xs transition ${
                  textPosition === p ? 'bg-white/20 text-white' : 'bg-white/5 text-white/70 hover:bg-white/10'
                }`}>
                {POSITION_LABEL[p]}
              </button>
            ))}
          </div>
          <div className="border-t border-white/10 pt-2 space-y-1">
            <button
              type="button"
              onClick={onOpenComments}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-white/80 hover:text-white hover:bg-white/10 transition">
              <ChatIcon size={14} />
              评论
            </button>
            <button
              type="button"
              onClick={onBackToTitle}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-white/80 hover:text-white hover:bg-white/10 transition">
              <HouseIcon size={14} />
              {t('backToTitle')}
            </button>
            <div className="flex items-center justify-between gap-2 px-1 pt-1">
              <ShareButton
                title={title}
                url={shareUrl}
              />
              <Button
                variant="ghost"
                color="red"
                size="sm"
                onClick={onRestart}>
                <ArrowCounterClockwiseIcon size={14} />
                {t('restartFromStart')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
