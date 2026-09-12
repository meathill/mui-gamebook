'use client';

/** 播放页只读 WebMCP 注册器（客户端小组件，SSR 输出 null）。 */
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
    mode: 'readonly',
    getDsl: () => `《${title}》（${slug}）共 ${sceneIds.length} 个场景：${sceneIds.join(', ')}`,
    listScenes: () => sceneIds.join(', ') || '暂无场景',
  });
  return null;
}
