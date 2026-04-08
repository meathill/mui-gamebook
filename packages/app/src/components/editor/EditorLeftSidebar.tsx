'use client';

import { useState, useMemo } from 'react';
import { VariableIcon, UsersIcon, Plus, Search, ChevronLeftIcon, ListIcon } from 'lucide-react';
import {
  VariableForm,
  VariableList,
  VariableFormData,
  defaultFormData,
  variableToFormData,
  formDataToVariable,
} from '@/components/editor/variables';
import {
  CharacterForm,
  CharacterList,
  CharacterFormData,
  defaultCharacterFormData,
  characterToFormData,
  formDataToCharacter,
} from '@/components/editor/characters';
import { useDialog } from '@/components/Dialog';
import type { Game, GameState, AICharacter } from '@mui-gamebook/parser/src/types';

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

/* ========== 大纲面板 ========== */

function SidebarOutline({
  sceneIds,
  onScrollToScene,
}: {
  sceneIds: string[];
  onScrollToScene?: (sceneId: string) => void;
}) {
  if (sceneIds.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-gray-400">
        <p>暂无场景</p>
        <p className="mt-1">输入 # 场景名 创建场景</p>
      </div>
    );
  }

  return (
    <div className="py-1">
      {sceneIds.map((id, index) => (
        <button
          key={id}
          type="button"
          onClick={() => onScrollToScene?.(id)}
          className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 transition-colors group">
          <span className="text-xs text-gray-400 tabular-nums w-5 text-right shrink-0">{index + 1}</span>
          <span className="text-sm text-gray-700 group-hover:text-gray-900 truncate font-mono">{id}</span>
        </button>
      ))}
      <div className="px-3 py-2 text-xs text-gray-400 border-t border-gray-100 mt-1">共 {sceneIds.length} 个场景</div>
    </div>
  );
}

/* ========== 变量面板 ========== */

function SidebarVariables({
  state,
  scenes,
  onChange,
}: {
  state: GameState;
  scenes: Record<string, { id: string }>;
  onChange: (newState: GameState) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVar, setSelectedVar] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<VariableFormData>(defaultFormData);
  const dialog = useDialog();

  const variables = Object.entries(state);
  const sceneList = Object.keys(scenes);

  const filteredVariables = searchQuery
    ? variables.filter(([name]) => name.toLowerCase().includes(searchQuery.toLowerCase()))
    : variables;

  function handleSelectVariable(name: string) {
    if (selectedVar === name) {
      setSelectedVar(null);
      return;
    }
    setSelectedVar(name);
    setIsCreating(false);
    setFormData(variableToFormData(name, state[name]));
  }

  function handleCreateNew() {
    setSelectedVar(null);
    setIsCreating(true);
    const newName = `var_${Date.now().toString().slice(-4)}`;
    setFormData({ ...defaultFormData, name: newName });
  }

  async function handleSaveVariable() {
    if (!formData.name.trim()) {
      await dialog.alert('变量名不能为空');
      return;
    }
    const newState = { ...state };
    if (selectedVar && formData.name !== selectedVar) {
      if (state[formData.name] !== undefined) {
        await dialog.alert('变量名已存在');
        return;
      }
      delete newState[selectedVar];
    }
    if (isCreating && state[formData.name] !== undefined) {
      await dialog.alert('变量名已存在');
      return;
    }
    newState[formData.name] = formDataToVariable(formData);
    onChange(newState);
    setSelectedVar(formData.name);
    setIsCreating(false);
  }

  async function handleDeleteVariable(name: string) {
    const confirmed = await dialog.confirm(`确定删除变量 "${name}" 吗？`);
    if (!confirmed) return;
    const newState = { ...state };
    delete newState[name];
    onChange(newState);
    if (selectedVar === name) {
      setSelectedVar(null);
      setFormData(defaultFormData);
    }
  }

  async function updateFormData(updates: Partial<VariableFormData>) {
    const newFormData = { ...formData, ...updates };
    setFormData(newFormData);
    if (selectedVar && !isCreating) {
      const newState = { ...state };
      if (updates.name && updates.name !== selectedVar) {
        if (state[updates.name] !== undefined) {
          await dialog.alert('变量名已存在');
          return;
        }
        delete newState[selectedVar];
        setSelectedVar(updates.name);
      }
      newState[newFormData.name] = formDataToVariable(newFormData);
      onChange(newState);
    }
  }

  if (selectedVar || isCreating) {
    return (
      <div className="flex flex-col">
        <button
          onClick={() => {
            setSelectedVar(null);
            setIsCreating(false);
          }}
          className="flex items-center gap-1 px-3 py-2 text-xs text-gray-500 hover:text-gray-700 border-b border-gray-100">
          <ChevronLeftIcon size={14} />
          返回列表
        </button>
        <VariableForm
          formData={formData}
          isCreating={isCreating}
          sceneList={sceneList}
          onUpdate={updateFormData}
          onSave={handleSaveVariable}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <SidebarSearchBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onCreateNew={handleCreateNew}
      />
      <VariableList
        variables={filteredVariables}
        selectedVar={selectedVar}
        onSelect={handleSelectVariable}
        onDelete={handleDeleteVariable}
        searchQuery={searchQuery}
      />
    </div>
  );
}

/* ========== 角色面板 ========== */

function SidebarCharacters({
  characters,
  onChange,
  gameId,
}: {
  characters: Record<string, AICharacter>;
  onChange: (characters: Record<string, AICharacter>) => void;
  gameId: string;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<CharacterFormData>(defaultCharacterFormData);
  const dialog = useDialog();

  const characterList = Object.entries(characters);

  const filteredCharacters = useMemo(() => {
    if (!searchQuery) return characterList;
    const query = searchQuery.toLowerCase();
    return characterList.filter(
      ([id, char]) => id.toLowerCase().includes(query) || char.name.toLowerCase().includes(query),
    );
  }, [characterList, searchQuery]);

  function handleSelectCharacter(id: string) {
    if (selectedId === id) {
      setSelectedId(null);
      return;
    }
    setSelectedId(id);
    setIsCreating(false);
    setFormData(characterToFormData(id, characters[id]));
  }

  function handleCreateNew() {
    setSelectedId(null);
    setIsCreating(true);
    const newId = `char_${Date.now().toString().slice(-4)}`;
    setFormData({ ...defaultCharacterFormData, id: newId });
  }

  async function handleSaveCharacter() {
    if (!formData.id.trim()) {
      await dialog.alert('角色 ID 不能为空');
      return;
    }
    if (!formData.name.trim()) {
      await dialog.alert('角色名称不能为空');
      return;
    }
    const newCharacters = { ...characters };
    if (isCreating && characters[formData.id]) {
      await dialog.alert('角色 ID 已存在');
      return;
    }
    if (selectedId && formData.id !== selectedId) {
      if (characters[formData.id]) {
        await dialog.alert('角色 ID 已存在');
        return;
      }
      delete newCharacters[selectedId];
    }
    newCharacters[formData.id] = formDataToCharacter(formData);
    onChange(newCharacters);
    setSelectedId(formData.id);
    setIsCreating(false);
  }

  async function handleDeleteCharacter(id: string) {
    const confirmed = await dialog.confirm(`确定删除角色 "${characters[id].name}" 吗？`);
    if (!confirmed) return;
    const newCharacters = { ...characters };
    delete newCharacters[id];
    onChange(newCharacters);
    if (selectedId === id) {
      setSelectedId(null);
      setFormData(defaultCharacterFormData);
    }
  }

  async function updateFormData(updates: Partial<CharacterFormData>) {
    const newFormData = { ...formData, ...updates };
    setFormData(newFormData);
    if (selectedId && !isCreating) {
      const newCharacters = { ...characters };
      if (updates.id && updates.id !== selectedId) {
        if (characters[updates.id]) {
          await dialog.alert('角色 ID 已存在');
          return;
        }
        delete newCharacters[selectedId];
        setSelectedId(updates.id);
      }
      newCharacters[newFormData.id] = formDataToCharacter(newFormData);
      onChange(newCharacters);
    }
  }

  if (selectedId || isCreating) {
    return (
      <div className="flex flex-col">
        <button
          onClick={() => {
            setSelectedId(null);
            setIsCreating(false);
          }}
          className="flex items-center gap-1 px-3 py-2 text-xs text-gray-500 hover:text-gray-700 border-b border-gray-100">
          <ChevronLeftIcon size={14} />
          返回列表
        </button>
        <CharacterForm
          formData={formData}
          isCreating={isCreating}
          gameId={gameId}
          onUpdate={updateFormData}
          onSave={handleSaveCharacter}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <SidebarSearchBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onCreateNew={handleCreateNew}
      />
      <CharacterList
        characters={filteredCharacters}
        selectedId={selectedId}
        onSelect={handleSelectCharacter}
        onDelete={handleDeleteCharacter}
        searchQuery={searchQuery}
      />
    </div>
  );
}

/* ========== 共用搜索栏 ========== */

function SidebarSearchBar({
  searchQuery,
  onSearchChange,
  onCreateNew,
}: {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onCreateNew: () => void;
}) {
  return (
    <div className="p-3 border-b border-gray-100">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="搜索..."
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={onCreateNew}
          className="p-1.5 bg-orange-500 text-white rounded-md hover:bg-orange-600"
          title="新建">
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}
