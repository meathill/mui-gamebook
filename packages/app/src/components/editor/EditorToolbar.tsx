'use client';

import Link from 'next/link';
import {
  Save,
  ArrowLeft,
  ExternalLink,
  FileText,
  Network,
  PlusCircle,
  Layout,
  Sparkles,
  ImagePlus,
  Settings,
  BookOpen,
  Variable,
  Users,
  BotIcon,
} from 'lucide-react';
import { useEditorStore } from '@/lib/editor/store';

export type Tab = 'settings' | 'variables' | 'characters' | 'story';

interface EditorToolbarProps {
  title?: string;
  slug: string;
  saving: boolean;
  assetGenerating: boolean;
  onToggleViewMode: () => void;
  onAddScene: () => void;
  onLayout: () => void;
  onGenerateAssets: () => void;
  onShowImporter: () => void;
  onSave: () => void;
}

export default function EditorToolbar({
  title,
  slug,
  saving,
  assetGenerating,
  onToggleViewMode,
  onAddScene,
  onLayout,
  onGenerateAssets,
  onShowImporter,
  onSave,
}: EditorToolbarProps) {
  // 从 store 读取状态
  const activeTab = useEditorStore((s) => s.activeTab);
  const setActiveTab = useEditorStore((s) => s.setActiveTab);
  const viewMode = useEditorStore((s) => s.viewMode);
  const chatOpen = useEditorStore((s) => s.chatOpen);
  const toggleChatOpen = useEditorStore((s) => s.toggleChatOpen);

  return (
    <header className="bg-white border-b px-6 py-3 flex justify-between items-center z-10 shadow-sm sticky top-16">
      <div className="flex items-center gap-4">
        <Link
          href="/admin"
          className="text-gray-500 hover:text-gray-700">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="font-semibold text-gray-900 hidden md:block">{title}</h1>

        {/* Tabs */}
        <div className="flex bg-gray-100 p-1 rounded-lg ml-4">
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'settings' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
            <Settings size={16} /> 设置
          </button>
          <button
            onClick={() => setActiveTab('variables')}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'variables' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
            <Variable size={16} /> 变量
          </button>
          <button
            onClick={() => setActiveTab('characters')}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'characters' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
            <Users size={16} /> 角色
          </button>
          <button
            onClick={() => setActiveTab('story')}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'story' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
            <BookOpen size={16} /> 故事
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        {activeTab === 'story' && viewMode === 'visual' && (
          <>
            <button
              onClick={onAddScene}
              className="p-2 text-green-700 hover:bg-green-50 rounded border border-green-200"
              title="添加场景">
              <PlusCircle size={18} />
            </button>
            <button
              onClick={onLayout}
              className="p-2 text-gray-700 hover:bg-gray-100 rounded border border-gray-200"
              title="自动布局">
              <Layout size={18} />
            </button>
          </>
        )}

        {activeTab === 'story' && (
          <>
            <button
              onClick={onShowImporter}
              className="flex items-center gap-2 px-3 py-2 text-purple-700 hover:bg-purple-50 rounded text-sm border border-purple-200">
              <Sparkles size={16} /> <span className="hidden sm:inline">AI 故事</span>
            </button>
            <button
              onClick={onGenerateAssets}
              disabled={assetGenerating}
              className="hidden items-center gap-2 px-3 py-2 text-orange-700 hover:bg-orange-50 rounded text-sm border border-orange-200">
              <ImagePlus size={16} /> <span className="hidden sm:inline">{assetGenerating ? '...' : '素材'}</span>
            </button>
            <button
              onClick={onToggleViewMode}
              className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded text-sm border border-gray-200">
              {viewMode === 'visual' ? <FileText size={16} /> : <Network size={16} />}
              <span className="hidden sm:inline">{viewMode === 'visual' ? '文本' : '可视化'}</span>
            </button>
          </>
        )}

        <Link
          href={`/play/${slug}`}
          target="_blank"
          className="p-2 text-gray-600 hover:bg-gray-100 rounded border border-gray-200"
          title="预览">
          <ExternalLink size={18} />
        </Link>

        {/* AI 助手按钮 - 非 settings tab 显示 */}
        {activeTab !== 'settings' && (
          <button
            onClick={toggleChatOpen}
            className={`flex items-center gap-2 px-3 py-2 rounded text-sm border transition-colors ${
              chatOpen
                ? 'bg-purple-600 text-white border-purple-600'
                : 'text-purple-700 hover:bg-purple-50 border-purple-200'
            }`}
            title="AI 助手">
            <BotIcon size={16} />
            <span className="hidden sm:inline">AI 助手</span>
          </button>
        )}

        <button
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">
          <Save size={16} /> {saving ? '保存中...' : '保存'}
        </button>
      </div>
    </header>
  );
}
