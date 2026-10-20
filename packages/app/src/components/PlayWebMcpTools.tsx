'use client';

/** 播放页只读 WebMCP 注册器（客户端小组件，SSR 输出 null）。 */
import { getPlaybackTools } from '@mui-gamebook/webmcp';
import { useWebMcpTools } from '@/lib/editor/useWebMcpTools';

export default function PlayWebMcpTools({
  slug,
  title,
  sceneIds,
}: {
  slug: string;
  title: string;
  sceneIds: string[];
}) {
  useWebMcpTools({
    tools: getPlaybackTools(),
    execute: (name) => {
      if (name === 'getDsl') {
        return `《${title}》（${slug}）共 ${sceneIds.length} 个场景：${sceneIds.join(', ')}`;
      }
      if (name === 'listScenes') return sceneIds.join(', ') || '暂无场景';
      return `只读页面不支持 ${name}`;
    },
  });
  return null;
}
