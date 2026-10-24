'use client';

import { QuestionIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { parse } from '@roudanio/parser';
import { useDialog } from '@/components/Dialog';
import type { EditorGame } from '@/lib/editor/useEditorData';
import { hasDeclaredMedia } from '@/lib/media-assistance/targets';

const DESCRIPTION = `亲爱的创作者，你好！感谢你使用姆伊游戏书，让自己的故事成为可以探索的世界。

如果你愿意，我们希望为你的作品添砖加瓦。开启后，我们会每天根据资源情况安排处理，为已发布的作品补充 AI 图片、视频、配音、背景音乐和音效，让故事更加生动。

我们会参考你的剧情、角色设定和已有风格，补充缺失的素材；必要时，也会规划素材位置和生成提示词。生成的素材会直接应用到作品中，不修改剧情和选项，也不会替换你已有的素材。

这项协助使用站方订阅的 AI 服务，受可用额度和生成速度影响，暂时无法承诺具体完成时间或素材数量。

你可以随时关闭后续协助。已经添加的素材会保留；你主动删除的素材，我们也不会再次补回。`;

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
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={game.mediaAssistanceEnabled ?? false}
            disabled={confirming || (game.canEnableMediaAssistance === false && !game.mediaAssistanceEnabled)}
            onChange={(event) => void handleChange(event.target.checked)}
            className="h-4 w-4 accent-orange-600 focus-visible:outline-2 focus-visible:outline-offset-2"
          />
          接受站方 AI 素材协助
        </label>
        <button
          type="button"
          aria-label="了解站方 AI 素材协助"
          className="p-1 rounded text-gray-500 hover:text-gray-900 focus-visible:outline-2"
          onClick={() => void dialog.alert(DESCRIPTION, '关于站方 AI 素材协助')}>
          <QuestionIcon size={18} />
        </button>
      </div>
      <p className="text-xs text-gray-500">保存后生效，仅处理已发布作品。</p>
    </div>
  );
}
