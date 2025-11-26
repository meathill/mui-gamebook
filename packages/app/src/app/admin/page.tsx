'use client';

import { useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import useSWR, { mutate } from 'swr';
import { Plus, Trash2, Edit, Eye, Lock, Globe } from 'lucide-react';
import Link from 'next/link';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function AdminPage() {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  // Use SWR to fetch games
  const { data: games, error } = useSWR('/api/cms/games', fetcher);

  if (isPending) return <div className="p-8 text-center">Loading...</div>;

  if (!session) {
    router.push('/sign-in');
    return null;
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const res = await fetch('/api/cms/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      });
      if (res.ok) {
        setNewTitle('');
        mutate('/api/cms/games'); // Refresh list
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (slug: string) => {
    if (!confirm('Are you sure? This cannot be undone.')) return;
    await fetch(`/api/cms/games/${slug}`, { method: 'DELETE' });
    mutate('/api/cms/games');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Games</h1>
            <p className="text-gray-500 mt-1">Manage your interactive stories</p>
          </div>
          <div className="text-sm text-gray-600">
            {session.user.email}
          </div>
        </header>

        {/* Create New Game */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-lg font-semibold mb-4">Create New Game</h2>
          <form onSubmit={handleCreate} className="flex gap-4">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Game Title (e.g. The Lost City)"
              className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
              required
            />
            <button
              type="submit"
              disabled={isCreating}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Plus size={18} /> Create
            </button>
          </form>
        </div>

        {/* Games List */}
        {error && <div className="text-red-500">Failed to load games</div>}
        {!games && !error && <div className="text-gray-500">Loading games...</div>}
        
        <div className="grid gap-4">
          {games && games.length === 0 && (
            <p className="text-center text-gray-500 py-8">No games yet. Create one above!</p>
          )}
          
          {games?.map((game: any) => (
            <div key={game.slug} className="bg-white p-4 rounded-lg shadow flex items-center justify-between group">
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-full ${game.published ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                  {game.published ? <Globe size={20} /> : <Lock size={20} />}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{game.title}</h3>
                  <p className="text-xs text-gray-500">/{game.slug} • Last updated: {new Date(game.updatedAt).toLocaleDateString()}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Link 
                  href={`/play/${game.slug}`} 
                  target="_blank"
                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                  title="Preview"
                >
                  <Eye size={18} />
                </Link>
                <Link 
                  href={`/admin/edit/${game.slug}`} 
                  className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                  title="Edit"
                >
                  <Edit size={18} />
                </Link>
                <button
                  onClick={() => handleDelete(game.slug)}
                  className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                  title="Delete"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}