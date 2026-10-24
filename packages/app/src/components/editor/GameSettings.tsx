import { useState } from 'react';
import { Game } from '@roudanio/parser/src/types';
import { XIcon } from '@phosphor-icons/react/dist/ssr';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface Props {
  game: Game;
  onSave: (updatedGame: Game) => void;
  onClose: () => void;
}

export default function GameSettings({ game, onSave, onClose }: Props) {
  const [formData, setFormData] = useState({
    title: game.title,
    description: game.description || '',
    backgroundStory: game.backgroundStory || '',
    cover_image: game.cover_image || '',
    tags: (game.tags || []).join(', '),
    published: game.published || false,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      ...game,
      ...formData,
      tags: formData.tags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t),
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold">Game GearIcon</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700">
            <XIcon size={24} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Title</label>
            <Input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="mt-1 block"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="mt-1 block h-20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Background Story (Markdown)</label>
            <Textarea
              value={formData.backgroundStory}
              onChange={(e) => setFormData({ ...formData, backgroundStory: e.target.value })}
              className="mt-1 block h-40 font-mono"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Cover ImageIcon (URL or &quot;prompt:...&quot;)
            </label>
            <Input
              type="text"
              value={formData.cover_image}
              onChange={(e) => setFormData({ ...formData, cover_image: e.target.value })}
              className="mt-1 block"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Tags (comma separated)</label>
            <Input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              className="mt-1 block"
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="published"
              checked={formData.published}
              onCheckedChange={(checked) => setFormData({ ...formData, published: checked === true })}
            />
            <label
              htmlFor="published"
              className="text-sm font-medium text-gray-700">
              Published
            </label>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="mr-3 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md">
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              FloppyDiskIcon GearIcon
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
