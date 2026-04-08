'use client';

import { useState } from 'react';
import { VariableIcon, UsersIcon } from 'lucide-react';
import EditorVariablesTab from '@/components/editor/EditorVariablesTab';
import EditorCharactersTab from '@/components/editor/EditorCharactersTab';
import type { Game, GameState, AICharacter } from '@mui-gamebook/parser/src/types';

type SidebarTab = 'variables' | 'characters';

interface EditorLeftSidebarProps {
  game: Game;
  gameId: string;
  onGameChange: (updater: (prev: Game) => Game) => void;
}

export default function EditorLeftSidebar({ game, gameId, onGameChange }: EditorLeftSidebarProps) {
  const [tab, setTab] = useState<SidebarTab>('variables');

  return (
    <div className="w-64 border-r border-gray-200 bg-white flex flex-col shrink-0 overflow-hidden">
      {/* Tab 切换 */}
      <div className="flex border-b border-gray-200 shrink-0">
        <button
          onClick={() => setTab('variables')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
            tab === 'variables' ? 'text-gray-900 border-b-2 border-gray-900' : 'text-gray-500 hover:text-gray-700'
          }`}>
          <VariableIcon size={14} />
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
      <div className="flex-1 overflow-y-auto p-3">
        {tab === 'variables' && (
          <EditorVariablesTab
            state={game.initialState}
            onChange={(newState: GameState) => onGameChange((prev) => ({ ...prev, initialState: newState }))}
            scenes={game.scenes}
          />
        )}
        {tab === 'characters' && (
          <EditorCharactersTab
            characters={game.ai.characters || {}}
            onChange={(chars: Record<string, AICharacter>) =>
              onGameChange((prev) => ({ ...prev, ai: { ...prev.ai, characters: chars } }))
            }
            gameId={gameId}
          />
        )}
      </div>
    </div>
  );
}
