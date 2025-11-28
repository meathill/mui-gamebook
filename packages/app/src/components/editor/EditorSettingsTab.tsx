import { useState, useRef } from 'react';
import { Game } from '@mui-gamebook/parser/src/types';
import MDEditor from '@uiw/react-md-editor';
import { Upload, Sparkles, X, Image as ImageIcon, Loader2 } from 'lucide-react';

interface Props {
  game: Game;
  onChange: (updatedGame: Game) => void;
  slug: string; // Need slug for upload/generate paths
}

export default function EditorSettingsTab({ game, onChange, slug }: Props) {
  const [generatingCover, setGeneratingCover] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverPrompt, setCoverPrompt] = useState('');
  const [showCoverGen, setShowCoverGen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (field: string, value: string | boolean | Record<string, unknown>) => {
    onChange({ ...game, [ field ]: value });
  };

  const handleTagsChange = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = e.currentTarget.value.trim();
      if (val && !game.tags?.includes(val)) {
        onChange({
          ...game,
          tags: [...(game.tags || []), val]
        });
        e.currentTarget.value = '';
      }
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange({
      ...game,
      tags: (game.tags || []).filter(t => t !== tagToRemove)
    });
  };

  const handleUploadCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[ 0 ];
    if (!file) return;

    setUploadingCover(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('slug', slug);

    try {
      const res = await fetch('/api/cms/assets/upload', {
        method: 'POST',
        body: formData,
      });
      const data = (await res.json()) as {
        url: string;
        error?: string;
      };
      if (res.ok) {
        handleChange('cover_image', data.url);
      } else {
        alert(data.error);
      }
    } catch (e) {
      alert('Upload failed: ' + (e as Error).message);
    } finally {
      setUploadingCover(false);
    }
  };

  const handleGenerateCover = async () => {
    if (!coverPrompt) return;
    setGeneratingCover(true);
    try {
      const res = await fetch('/api/cms/assets/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: coverPrompt,
          gameSlug: slug,
          type: 'ai_image'
        }),
      });
      const data = (await res.json()) as {
        url: string;
        error?: string;
      };
      if (res.ok) {
        handleChange('cover_image', data.url);
        setShowCoverGen(false);
      } else {
        alert(data.error);
      }
    } catch (e) {
      alert('Generation failed: ' + (e as Error).message);
    } finally {
      setGeneratingCover(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200 mt-6">
      <h2 className="text-xl font-bold text-gray-900 mb-8 pb-4 border-b">Game Configuration</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Meta */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
              <input
                type="text"
                disabled
                value={slug}
                className="block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm p-2 text-gray-500 cursor-not-allowed border"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={game.description || ''}
              onChange={e => handleChange('description', e.target.value)}
              rows={3}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
            <div className="flex flex-wrap gap-2 p-2 border border-gray-300 rounded-md bg-white">
              {(game.tags || []).map(tag => (
                <span key={tag} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                  {tag}
                  <button onClick={() => removeTag(tag)} className="ml-1 text-blue-600 hover:text-blue-900"><X size={12} /></button>
                </span>
              ))}
              <input
                type="text"
                placeholder="Type & Enter..."
                onKeyDown={handleTagsChange}
                className="flex-1 outline-none text-sm min-w-[80px]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Background Story</label>
            <div data-color-mode="light">
              <MDEditor
                value={game.backgroundStory || ''}
                onChange={(val) => handleChange('backgroundStory', val || '')}
                height={300}
                preview="edit"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Cover & Publish */}
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Cover Image</label>
            <div className="relative w-full aspect-[3/4] bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center overflow-hidden hover:border-blue-400 transition-colors group">
              {game.cover_image && !game.cover_image.startsWith('prompt:') ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={game.cover_image} alt="Cover" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button onClick={() => fileInputRef.current?.click()} className="p-2 bg-white rounded-full hover:bg-gray-100"><Upload size={16} /></button>
                    <button onClick={() => setShowCoverGen(true)} className="p-2 bg-white rounded-full hover:bg-gray-100"><Sparkles size={16} /></button>
                  </div>
                </>
              ) : (
                <div className="text-center p-4">
                  <ImageIcon className="mx-auto h-10 w-10 text-gray-400 mb-2" />
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingCover}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {uploadingCover ? 'Uploading...' : 'Upload Image'}
                    </button>
                    <span className="text-xs text-gray-400">- OR -</span>
                    <button
                      onClick={() => setShowCoverGen(!showCoverGen)}
                      className="text-sm text-purple-600 hover:text-purple-800 font-medium"
                    >
                      Generate AI Cover
                    </button>
                  </div>
                </div>
              )}
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleUploadCover}
              />
            </div>

            {showCoverGen && (
              <div className="mt-3 p-3 bg-purple-50 rounded-md border border-purple-100">
                <textarea
                  placeholder="Describe your cover..."
                  value={coverPrompt}
                  onChange={e => setCoverPrompt(e.target.value)}
                  className="w-full p-2 text-sm border rounded mb-2 h-20 resize-none"
                />
                <button
                  onClick={handleGenerateCover}
                  disabled={generatingCover || !coverPrompt}
                  className="w-full py-1.5 bg-purple-600 text-white rounded text-xs font-medium hover:bg-purple-700 disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {generatingCover ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  Generate Cover
                </button>
              </div>
            )}
          </div>

          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Publishing</h3>
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={game.published || false}
                  onChange={e => handleChange('published', e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </div>
              <span className={`text-sm font-medium ${game.published ? 'text-green-700' : 'text-gray-500'}`}>
                {game.published ? 'Published' : 'Draft'}
              </span>
            </label>
            <p className="text-xs text-gray-500 mt-2">
              Published games are visible to everyone on the homepage.
            </p>
          </div>

          {/* AI Style Config Placeholder */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
            <h3 className="text-sm font-medium text-blue-900 mb-2">AI Style</h3>
            <textarea
              value={game.ai?.style?.image || ''}
              onChange={e => handleChange('ai', { ...game.ai, style: { ...game.ai.style, image: e.target.value } })}
              placeholder="Global art style prompt (e.g. 'watercolor, fantasy')..."
              className="w-full p-2 text-sm border border-blue-200 rounded h-20 resize-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
