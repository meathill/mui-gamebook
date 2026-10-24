'use client';

import { useState } from 'react';
import { SparkleIcon } from '@phosphor-icons/react';
import type { EditorGame } from '@/lib/editor/useEditorData';
import { MEDIA_ASSISTANCE_DESCRIPTION } from '@/lib/media-assistance/description';
import { useEditorStore } from '@/lib/editor/store';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

/**
 * 编辑器工具栏中部的长期邀请 banner：
 * 仅对可开启且尚未开启素材协助的作者展示，开启后自动消失。
 * 点击弹出完整说明，引导去设置页开启。
 */
export default function MediaAssistanceBanner({ game }: { game: EditorGame }) {
  const setActiveTab = useEditorStore((s) => s.setActiveTab);
  const [open, setOpen] = useState(false);

  const isEligible = game.canEnableMediaAssistance === true && !game.mediaAssistanceEnabled;
  if (!isEligible) return null;

  return (
    <div className="hidden min-w-0 flex-1 justify-center md:flex">
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="了解站方 AI 素材协助"
        className="flex min-w-0 max-w-xl cursor-pointer items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs text-orange-800 transition-colors hover:border-orange-300 hover:bg-orange-100">
        <SparkleIcon
          size={14}
          className="shrink-0 text-orange-500"
        />
        <span className="truncate">站方 AI 素材协助：免费为已发布作品补充插画、配音、音乐</span>
        <span className="shrink-0 font-medium text-orange-600">了解详情</span>
      </button>

      <Dialog
        open={open}
        onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>关于站方 AI 素材协助</DialogTitle>
            <DialogDescription className="whitespace-pre-wrap leading-relaxed">
              {MEDIA_ASSISTANCE_DESCRIPTION}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}>
              以后再说
            </Button>
            <Button
              onClick={() => {
                setOpen(false);
                setActiveTab('settings');
              }}>
              去设置开启
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
