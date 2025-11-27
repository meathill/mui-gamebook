import { Game } from '@mui-gamebook/parser/src/types';

interface Props {
  game: Game;
  onChange: (updatedGame: Game) => void;
}

export default function EditorSettingsTab({ game, onChange }: Props) {
  const handleChange = (field: string, value: any) => {
    onChange({ ...game, [field]: value });
  };

  const handleTagsChange = (value: string) => {
    onChange({ 
      ...game, 
      tags: value.split(',').map(t => t.trim()).filter(t => t) 
    });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200 mt-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6 border-b pb-2">Game Metadata</h2>
      
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={game.title}
              onChange={e => handleChange('title', e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slug (Read-only)</label>
            <input
              type="text"
              disabled
              value={(game as any).slug || 'Saved on server'}
              className="block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm p-2 text-gray-500 cursor-not-allowed border"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={game.description || ''}
            onChange={e => handleChange('description', e.target.value)}
            rows={3}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cover Image (URL or Prompt)</label>
          <input
            type="text"
            value={game.cover_image || ''}
            onChange={e => handleChange('cover_image', e.target.value)}
            placeholder="https://... or prompt: A dark castle..."
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
          />
          {game.cover_image && !game.cover_image.startsWith('prompt:') && (
            <div className="mt-2 relative h-40 w-full bg-gray-100 rounded overflow-hidden border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={game.cover_image} alt="Cover" className="h-full w-full object-cover" />
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
          <input
            type="text"
            value={(game.tags || []).join(', ')}
            onChange={e => handleTagsChange(e.target.value)}
            placeholder="fantasy, rpg, adventure"
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Background Story (Markdown)</label>
          <textarea
            value={game.backgroundStory || ''}
            onChange={e => handleChange('backgroundStory', e.target.value)}
            rows={10}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 font-mono text-sm"
          />
        </div>

        <div className="flex items-center gap-3 pt-4 border-t">
          <input
            type="checkbox"
            id="published"
            checked={game.published || false}
            onChange={e => handleChange('published', e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="published" className="text-sm font-medium text-gray-900">
            Publish this game (Visible on homepage)
          </label>
        </div>
      </div>
    </div>
  );
}
