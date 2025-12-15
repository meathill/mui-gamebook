import { useState, useEffect } from 'react';
import { Search, Plus, Loader2, Gamepad2 } from 'lucide-react';

interface MiniGame {
  id: number;
  name: string;
  description: string | null;
  prompt: string;
  status: string;
  createdAt: number;
}

interface MiniGameSelectorProps {
  onSelect: (minigame: MiniGame) => void;
  onGenerate: () => void;
  isGenerating?: boolean;
}

export default function MiniGameSelector({ onSelect, onGenerate, isGenerating }: MiniGameSelectorProps) {
  const [minigames, setMinigames] = useState<MiniGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMinigames();
  }, []);

  const loadMinigames = async (searchTerm?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.set('search', searchTerm);

      const res = await fetch(`/api/cms/minigames?${params.toString()}`);
      if (!res.ok) {
        const data = (await res.json()) as { error: string };
        throw new Error(data.error || '加载失败');
      }
      const data = (await res.json()) as { minigames: MiniGame[] };
      setMinigames(data.minigames);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadMinigames(search);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="space-y-2">
      {/* 搜索和新建 */}
      <div className="flex gap-1">
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="搜索小游戏..."
            className="w-full pl-7 pr-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-purple-500 outline-none"
          />
          <Search
            size={12}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400"
          />
        </div>
        <button
          onClick={handleSearch}
          className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded">
          搜索
        </button>
        <button
          onClick={onGenerate}
          disabled={isGenerating}
          className="px-2 py-1 text-xs bg-purple-600 text-white hover:bg-purple-500 rounded flex items-center gap-1 disabled:bg-purple-300">
          {isGenerating ? (
            <Loader2
              size={12}
              className="animate-spin"
            />
          ) : (
            <Plus size={12} />
          )}
          新建
        </button>
      </div>

      {/* 小游戏列表 */}
      <div className="max-h-32 overflow-y-auto border border-gray-200 rounded">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2
              size={16}
              className="animate-spin text-gray-400"
            />
          </div>
        ) : error ? (
          <div className="text-xs text-red-500 p-2">{error}</div>
        ) : minigames.length === 0 ? (
          <div className="text-xs text-gray-400 p-2 text-center">暂无小游戏，点击「新建」创建一个</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {minigames.map((mg) => (
              <button
                key={mg.id}
                onClick={() => onSelect(mg)}
                className="w-full p-2 text-left hover:bg-purple-50 flex items-start gap-2">
                <Gamepad2
                  size={14}
                  className="text-purple-500 mt-0.5 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-gray-700 truncate">{mg.name}</div>
                  <div className="text-xs text-gray-400 truncate">{mg.prompt}</div>
                </div>
                {mg.status !== 'completed' && (
                  <span className="text-xs text-yellow-600 bg-yellow-50 px-1 rounded">
                    {mg.status === 'pending' ? '生成中' : '失败'}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
