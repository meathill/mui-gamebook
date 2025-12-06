import { useState, useMemo } from 'react';
import { Plus, Search } from 'lucide-react';
import type { AICharacter } from '@mui-gamebook/parser/src/types';
import { useDialog } from '@/components/Dialog';
import {
  CharacterForm,
  CharacterList,
  CharacterFormData,
  defaultCharacterFormData,
  characterToFormData,
  formDataToCharacter,
} from './characters';

interface Props {
  characters: Record<string, AICharacter>;
  onChange: (characters: Record<string, AICharacter>) => void;
  gameId: string;
}

export default function EditorCharactersTab({ characters, onChange, gameId }: Props) {
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
      ([id, char]) =>
        id.toLowerCase().includes(query) || char.name.toLowerCase().includes(query)
    );
  }, [characterList, searchQuery]);

  const handleSelectCharacter = (id: string) => {
    setSelectedId(id);
    setIsCreating(false);
    setFormData(characterToFormData(id, characters[ id ]));
  };

  const handleCreateNew = () => {
    setSelectedId(null);
    setIsCreating(true);
    const newId = `char_${Date.now().toString().slice(-4)}`;
    setFormData({ ...defaultCharacterFormData, id: newId });
  };

  const handleSaveCharacter = async () => {
    if (!formData.id.trim()) {
      await dialog.alert('角色 ID 不能为空');
      return;
    }
    if (!formData.name.trim()) {
      await dialog.alert('角色名称不能为空');
      return;
    }

    const newCharacters = { ...characters };

    // 检查 ID 重复
    if (isCreating && characters[ formData.id ]) {
      await dialog.alert('角色 ID 已存在');
      return;
    }

    // 如果是编辑且修改了 ID
    if (selectedId && formData.id !== selectedId) {
      if (characters[ formData.id ]) {
        await dialog.alert('角色 ID 已存在');
        return;
      }
      delete newCharacters[ selectedId ];
    }

    newCharacters[ formData.id ] = formDataToCharacter(formData);
    onChange(newCharacters);

    setSelectedId(formData.id);
    setIsCreating(false);
  };

  const handleDeleteCharacter = async (id: string) => {
    const confirmed = await dialog.confirm(`确定删除角色 "${characters[ id ].name}" 吗？`);
    if (!confirmed) return;

    const newCharacters = { ...characters };
    delete newCharacters[ id ];
    onChange(newCharacters);

    if (selectedId === id) {
      setSelectedId(null);
      setFormData(defaultCharacterFormData);
    }
  };

  const updateFormData = async (updates: Partial<CharacterFormData>) => {
    const newFormData = { ...formData, ...updates };
    setFormData(newFormData);

    // 自动保存（编辑模式）
    if (selectedId && !isCreating) {
      const newCharacters = { ...characters };
      if (updates.id && updates.id !== selectedId) {
        if (characters[ updates.id ]) {
          await dialog.alert('角色 ID 已存在');
          return;
        }
        delete newCharacters[ selectedId ];
        setSelectedId(updates.id);
      }
      newCharacters[ newFormData.id ] = formDataToCharacter(newFormData);
      onChange(newCharacters);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex">
      {/* 左侧列表 */}
      <div className="w-64 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-3">角色管理</h2>

          {/* 搜索和新建 */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索..."
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={handleCreateNew}
              className="p-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              title="新建角色"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* 角色列表 */}
        <div className="flex-1 overflow-y-auto">
          <CharacterList
            characters={filteredCharacters}
            selectedId={selectedId}
            onSelect={handleSelectCharacter}
            onDelete={handleDeleteCharacter}
            searchQuery={searchQuery}
          />
        </div>
      </div>

      {/* 右侧编辑区域 */}
      <div className="flex-1 overflow-y-auto">
        {selectedId || isCreating ? (
          <CharacterForm
            formData={formData}
            isCreating={isCreating}
            gameId={gameId}
            onUpdate={updateFormData}
            onSave={handleSaveCharacter}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400">
            <div className="text-center">
              <p className="mb-2">选择左侧角色进行编辑</p>
              <p className="text-sm">或点击 + 按钮新建角色</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
