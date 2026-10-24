'use client';

import { QuestionIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { parse } from '@roudanio/parser';
import { useDialog } from '@/components/Dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import type { EditorGame } from '@/lib/editor/useEditorData';
import { MEDIA_ASSISTANCE_DESCRIPTION } from '@/lib/media-assistance/description';
import { hasDeclaredMedia } from '@/lib/media-assistance/targets';

export default function MediaAssistanceSetting({
  game,
  content,
  onChange,
}: {
  game: EditorGame;
  content?: string;
  onChange: (game: EditorGame) => void;
}) {
  const dialog = useDialog();
  const [confirming, setConfirming] = useState(false);
  async function handleChange(enabled: boolean) {
    const parsed = content ? parse(content) : null;
    const currentGame = parsed?.success ? { ...game, scenes: parsed.data.scenes } : game;
    if (enabled && !hasDeclaredMedia(currentGame)) {
      setConfirming(true);
      try {
        const accepted = await dialog.confirm(
          '你的作品目前还没有声明需要生成的 AI 素材。开启后，我们会根据故事内容规划素材位置和生成提示词，并将生成结果直接加入作品，不修改剧情和选项。是否接受这种协助方式？',
          '允许我们规划素材吗？',
          { confirmText: '接受并开启', cancelText: '暂不开启' },
        );
        if (!accepted) return;
      } finally {
        setConfirming(false);
      }
    }
    onChange({ ...game, mediaAssistanceEnabled: enabled, mediaPlanningConfirmed: enabled });
  }
  return (
    <div className="rounded-lg border border-orange-200 bg-orange-50/60 p-3">
      <div className="flex items-center gap-2">
        <Checkbox
          id="media-assistance-toggle"
          checked={game.mediaAssistanceEnabled ?? false}
          disabled={confirming || (game.canEnableMediaAssistance === false && !game.mediaAssistanceEnabled)}
          onCheckedChange={(checked) => void handleChange(checked === true)}
        />
        <label
          htmlFor="media-assistance-toggle"
          className="cursor-pointer text-sm font-medium text-orange-900">
          接受站方 AI 素材协助
        </label>
        <Badge>推荐</Badge>
        <button
          type="button"
          aria-label="了解站方 AI 素材协助"
          className="ml-auto rounded p-1 text-orange-600/70 hover:text-orange-800 focus-visible:outline-2"
          onClick={() => void dialog.alert(MEDIA_ASSISTANCE_DESCRIPTION, '关于站方 AI 素材协助')}>
          <QuestionIcon size={18} />
        </button>
      </div>
      <p className="mt-1 text-xs text-orange-700/80">保存后生效，仅处理已发布作品。</p>
    </div>
  );
}
