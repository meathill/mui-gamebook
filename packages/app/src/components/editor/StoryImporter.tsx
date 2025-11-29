import { useState } from 'react';
import { X, Sparkles, Loader2Icon } from 'lucide-react';
import { useDialog } from '@/components/Dialog';

interface Props {
  id: string;
  onImport: (script: string) => void;
  onClose: () => void;
}

export default function StoryImporter({ id, onImport, onClose }: Props) {
  const [story, setStory] = useState('');
  const [loading, setLoading] = useState(false);
  const dialog = useDialog();

  const handleGenerate = async () => {
    if (!story.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/cms/games/${id}/generate-script`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ story }),
      });

      if (!res.ok) {
        const data = (await res.json()) as {
          error: string;
        };
        throw new Error(data.error || '生成失败');
      }

      const data = (await res.json()) as {
        script: string;
      };
      onImport(data.script);
      onClose();
    } catch (e: unknown) {
      await dialog.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="text-purple-500" />
            AI 故事导入器
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><X size={24} /></button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          在此粘贴你的故事或大纲。AI 会将其转换为可玩的游戏脚本，包含场景和选项。
        </p>

        <textarea
          value={story}
          onChange={e => setStory(e.target.value)}
          className="w-full h-64 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 resize-none mb-4"
          placeholder="从前有座山..."
        />

        <div className="flex justify-end">
          <button
            onClick={handleGenerate}
            disabled={loading || !story.trim()}
            className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
            type="button"
          >
            {loading && <Loader2Icon className="animate-spin size-4" />}
            {loading ? '生成中...' : '生成游戏脚本'}
          </button>
        </div>
      </div>
    </div>
  );
}
