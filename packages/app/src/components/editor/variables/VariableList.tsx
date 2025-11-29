import { Eye, Trash2 } from 'lucide-react';
import type { GameState } from '@mui-gamebook/parser/src/types';
import { getDisplayValue, isVisible } from './utils';

interface VariableListProps {
  variables: [string, GameState[string]][];
  selectedVar: string | null;
  onSelect: (name: string) => void;
  onDelete: (name: string) => void;
  searchQuery: string;
}

export default function VariableList({ 
  variables, 
  selectedVar, 
  onSelect, 
  onDelete,
  searchQuery
}: VariableListProps) {
  if (variables.length === 0) {
    return (
      <div className="p-4 text-center text-gray-400 text-sm">
        {searchQuery ? '无匹配变量' : '暂无变量'}
      </div>
    );
  }

  return (
    <div className="py-1">
      {variables.map(([name, val]) => (
        <div
          key={name}
          className={`px-4 py-2 cursor-pointer flex items-center gap-2 hover:bg-gray-50 ${
            selectedVar === name ? 'bg-blue-50 border-l-2 border-blue-500' : ''
          }`}
          onClick={() => onSelect(name)}
        >
          <div className="flex-1 min-w-0">
            <div className="font-mono text-sm text-gray-900 truncate">{name}</div>
            <div className="text-xs text-gray-500 truncate">= {getDisplayValue(val)}</div>
          </div>
          {isVisible(val) && (
            <Eye size={12} className="text-green-600 flex-shrink-0" />
          )}
          <button
            onClick={e => { e.stopPropagation(); onDelete(name); }}
            className="p-1 text-gray-400 hover:text-red-600 rounded flex-shrink-0"
          >
            <Trash2 size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}
