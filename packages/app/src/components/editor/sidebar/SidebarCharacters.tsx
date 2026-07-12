'use client';

import { useState, useMemo } from 'react';
import { CaretLeftIcon } from '@phosphor-icons/react';
import {
  CharacterForm,
  CharacterList,
  CharacterFormData,
  defaultCharacterFormData,
  characterToFormData,
  formDataToCharacter,
} from '@/components/editor/characters';
import { useDialog } from '@/components/Dialog';
import type { AICharacter } from '@mui-gamebook/parser/src/types';
import SidebarSearchBar from './SidebarSearchBar';

interface SidebarCharactersProps {
  characters: Record<string, AICharacter>;
  onChange: (characters: Record<string, AICharacter>) => void;
  gameId: string;
}

/**
 * 角色面板
 */
export default function SidebarCharacters({ characters, onChange, gameId }: SidebarCharactersProps) {
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
          <CaretLeftIcon size={14} />
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
