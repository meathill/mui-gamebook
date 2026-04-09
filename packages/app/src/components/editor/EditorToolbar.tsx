'use client';

import Link from 'next/link';
import {
  SaveIcon,
  ArrowLeftIcon,
  ExternalLinkIcon,
  PlusCircleIcon,
  LayoutIcon,
  SettingsIcon,
  BookOpenIcon,
  BotIcon,
  GitBranchIcon,
  PanelLeftIcon,
} from 'lucide-react';
import { useEditorStore } from '@/lib/editor/store';
import type { SaveStatus } from '@/hooks/useAutoSave';

export type Tab = 'settings' | 'story' | 'flowchart';

interface EditorToolbarProps {
  title?: string;
  slug: string;
  saving: boolean;
  saveStatus?: SaveStatus;
  previewUrl?: string;
  onAddScene: () => void;
  onLayout: () => void;
  onSave: () => void;
  leftSidebarOpen: boolean;
  onToggleLeftSidebar: () => void;
}

const SAVE_STATUS_MAP: Record<SaveStatus, { label: string; className: string }> = {
  saved: { label: '已保存', className: 'text-green-600' },
  saving: { label: '保存中...', className: 'text-gray-400' },
  unsaved: { label: '未保存', className: 'text-orange-500' },
};

export default function EditorToolbar({
  title,
  slug,
  saving,
  saveStatus = 'saved',
  previewUrl,
  onAddScene,
  onLayout,
  onSave,
  leftSidebarOpen,
  onToggleLeftSidebar,
}: EditorToolbarProps) {
  const activeTab = useEditorStore((s) => s.activeTab);
  const setActiveTab = useEditorStore((s) => s.setActiveTab);
  const chatOpen = useEditorStore((s) => s.chatOpen);
  const toggleChatOpen = useEditorStore((s) => s.toggleChatOpen);

  return (
    <header className="bg-white border-b px-3 sm:px-4 py-2 flex justify-between items-center z-10 sticky top-16">
      <div className="flex items-center gap-3">
        <Link
          href="/my/games"
          className="text-gray-500 hover:text-gray-700">
          <ArrowLeftIcon size={18} />
        </Link>
        <h1 className="font-semibold text-gray-900 text-sm hidden md:block truncate max-w-40">{title}</h1>

        {/* Tabs: 设置 | 故事 | 流程图 */}
        <div className="flex bg-gray-100 p-0.5 rounded-lg ml-2">
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === 'settings' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <SettingsIcon size={14} />
            <span className="hidden sm:inline">设置</span>
          </button>
          <button
            onClick={() => setActiveTab('story')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === 'story' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <BookOpenIcon size={14} />
            <span className="hidden sm:inline">故事</span>
          </button>
          <button
            onClick={() => setActiveTab('flowchart')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === 'flowchart' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <GitBranchIcon size={14} />
            <span className="hidden sm:inline">流程图</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {/* 流程图模式的工具按钮 */}
        {activeTab === 'flowchart' && (
          <>
            <button
              onClick={onAddScene}
              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded border border-gray-200"
              title="添加场景">
              <PlusCircleIcon size={16} />
            </button>
            <button
              onClick={onLayout}
              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded border border-gray-200"
              title="自动布局">
              <LayoutIcon size={16} />
            </button>
            <div className="w-px h-5 bg-gray-200 mx-1" />
          </>
        )}

        {/* 左侧栏切换 */}
        {activeTab !== 'settings' && (
          <button
            onClick={onToggleLeftSidebar}
            className={`p-1.5 rounded border transition-colors ${
              leftSidebarOpen
                ? 'text-gray-900 bg-gray-100 border-gray-300'
                : 'text-gray-500 hover:bg-gray-100 border-gray-200'
            }`}
            title="变量/角色面板">
            <PanelLeftIcon size={16} />
          </button>
        )}

        {/* 预览 */}
        <a
          href={`${previewUrl || ''}/play/${slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 text-gray-500 hover:bg-gray-100 rounded border border-gray-200"
          title="预览">
          <ExternalLinkIcon size={16} />
        </a>

        {/* AI 助手 */}
        {activeTab !== 'settings' && (
          <button
            onClick={toggleChatOpen}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs border transition-colors ${
              chatOpen
                ? 'bg-orange-500 text-white border-orange-500'
                : 'text-gray-600 hover:bg-gray-100 border-gray-200'
            }`}
            title="AI 助手">
            <BotIcon size={14} />
            <span className="hidden sm:inline">AI 助手</span>
          </button>
        )}

        {/* 自动保存状态 */}
        {!saving && (
          <span className={`text-xs hidden sm:inline ${SAVE_STATUS_MAP[saveStatus].className}`}>
            {SAVE_STATUS_MAP[saveStatus].label}
          </span>
        )}

        {/* 保存 */}
        <button
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-1.5 bg-orange-500 text-white px-3 py-1.5 rounded hover:bg-orange-600 disabled:opacity-50 text-xs font-medium">
          <SaveIcon size={14} />
          <span className="hidden sm:inline">{saving ? '保存中...' : '保存'}</span>
        </button>
      </div>
    </header>
  );
}
