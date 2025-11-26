'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { Save, ArrowLeft, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function EditorPage() {
  const { slug } = useParams();
  const router = useRouter();
  const { data: session, isPending: isAuthPending } = authClient.useSession();
  
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (slug) {
      fetch(`/api/cms/games/${slug}`)
        .then(async (res) => {
          if (!res.ok) throw new Error('Failed to load game');
          const data = await res.json();
          setContent(data.content);
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [slug]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/cms/games/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }
      alert('Saved successfully!');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (isAuthPending || loading) return <div className="p-8 text-center">Loading...</div>;
  if (!session) { router.push('/sign-in'); return null; }
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Toolbar */}
      <header className="bg-white border-b px-6 py-3 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="font-semibold text-gray-900">Editing: {slug}</h1>
        </div>
        <div className="flex gap-3">
          <Link 
            href={`/play/${slug}`} 
            target="_blank"
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-md text-sm"
          >
            <ExternalLink size={16} /> Preview
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
          >
            <Save size={16} /> {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </header>

      {/* Editor Area */}
      <div className="flex-1 p-6 max-w-5xl mx-auto w-full">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full h-[80vh] p-4 font-mono text-sm bg-white border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          spellCheck={false}
        />
        <p className="mt-2 text-xs text-gray-500 text-right">
          Supports Markdown & Gamebook DSL
        </p>
      </div>
    </div>
  );
}
