import { Trash2 } from 'lucide-react';
import type { AICharacter } from '@mui-gamebook/parser/src/types';

interface Props {
  characters: [string, AICharacter][];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  searchQuery: string;
}

export default function CharacterList({ characters, selectedId, onSelect, onDelete, searchQuery }: Props) {
  if (characters.length === 0) {
    return (
      <div className="p-4 text-center text-gray-400 text-sm">
        {searchQuery ? '未找到匹配的角色' : '暂无角色，点击 + 创建'}
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {characters.map(([id, char]) => (
        <div
          key={id}
          onClick={() => onSelect(id)}
          className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 transition-colors ${
            selectedId === id ? 'bg-blue-50 border-l-2 border-blue-500' : ''
          }`}>
          {/* 头像 */}
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
            {char.image_url ? (
              <img
                src={char.image_url}
                alt={char.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-lg text-gray-400">{char.name.charAt(0).toUpperCase()}</span>
            )}
          </div>

          {/* 信息 */}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-gray-900 truncate">{char.name}</div>
            <div className="text-xs text-gray-500 truncate">{id}</div>
          </div>

          {/* 删除按钮 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(id);
            }}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
            title="删除角色">
            <Trash2 size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
