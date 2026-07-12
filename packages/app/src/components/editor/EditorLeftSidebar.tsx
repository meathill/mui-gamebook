'use client';

import { useState } from 'react';
import { BracketsCurlyIcon, UsersIcon, ListIcon } from '@phosphor-icons/react';
import { SidebarOutline, SidebarVariables, SidebarCharacters } from './sidebar';
import type { Game } from '@mui-gamebook/parser/src/types';

type SidebarTab = 'outline' | 'variables' | 'characters';

interface EditorLeftSidebarProps {
  game: Game;
  gameId: string;
  onGameChange: (updater: (prev: Game) => Game) => void;
  /** 场景 ID 列表（从编辑器文本中提取） */
  sceneIds?: string[];
  /** 点击大纲中的场景时回调 */
  onScrollToScene?: (sceneId: string) => void;
}

export default function EditorLeftSidebar({
  game,
  gameId,
  onGameChange,
  sceneIds,
  onScrollToScene,
}: EditorLeftSidebarProps) {
  const [tab, setTab] = useState<SidebarTab>('outline');

  return (
    <div className="w-72 h-[calc(100dvh-7rem-2px)] max-h-[calc(100dvh-7rem-2px)] sticky top-28 border-r border-gray-200 bg-white flex flex-col shrink-0 overflow-hidden">
      {/* Tab 切换 */}
      <div className="flex border-b border-gray-200 shrink-0">
        <button
          onClick={() => setTab('outline')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
            tab === 'outline' ? 'text-gray-900 border-b-2 border-gray-900' : 'text-gray-500 hover:text-gray-700'
          }`}>
          <ListIcon size={14} />
          大纲
        </button>
        <button
          onClick={() => setTab('variables')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
            tab === 'variables' ? 'text-gray-900 border-b-2 border-gray-900' : 'text-gray-500 hover:text-gray-700'
          }`}>
          <BracketsCurlyIcon size={14} />
          变量
        </button>
        <button
          onClick={() => setTab('characters')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
            tab === 'characters' ? 'text-gray-900 border-b-2 border-gray-900' : 'text-gray-500 hover:text-gray-700'
          }`}>
          <UsersIcon size={14} />
          角色
        </button>
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'outline' && (
          <SidebarOutline
            sceneIds={sceneIds || []}
            onScrollToScene={onScrollToScene}
          />
        )}
        {tab === 'variables' && (
          <SidebarVariables
            state={game.initialState}
            scenes={game.scenes}
            onChange={(newState) => onGameChange((prev) => ({ ...prev, initialState: newState }))}
          />
        )}
        {tab === 'characters' && (
          <SidebarCharacters
            characters={game.ai.characters || {}}
            onChange={(chars) => onGameChange((prev) => ({ ...prev, ai: { ...prev.ai, characters: chars } }))}
            gameId={gameId}
          />
        )}
      </div>
    </div>
  );
}
