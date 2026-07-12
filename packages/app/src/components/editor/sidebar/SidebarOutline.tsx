'use client';

interface SidebarOutlineProps {
  sceneIds: string[];
  onScrollToScene?: (sceneId: string) => void;
}

/**
 * 大纲面板
 */
export default function SidebarOutline({ sceneIds, onScrollToScene }: SidebarOutlineProps) {
  if (sceneIds.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-gray-400">
        <p>暂无场景</p>
        <p className="mt-1">输入 # 场景名 创建场景</p>
      </div>
    );
  }

  return (
    <div className="py-1">
      {sceneIds.map((id, index) => (
        <button
          key={id}
          type="button"
          onClick={() => onScrollToScene?.(id)}
          className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 transition-colors group">
          <span className="text-xs text-gray-400 tabular-nums w-5 text-right shrink-0">{index + 1}</span>
          <span className="text-sm text-gray-700 group-hover:text-gray-900 truncate font-mono">{id}</span>
        </button>
      ))}
      <div className="px-3 py-2 text-xs text-gray-400 border-t border-gray-100 mt-1">共 {sceneIds.length} 个场景</div>
    </div>
  );
}
