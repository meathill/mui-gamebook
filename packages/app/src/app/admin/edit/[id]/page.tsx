import { ReactFlowProvider } from '@xyflow/react';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import VisualEditor from '@/components/editor/VisualEditor';

type Props = {
  params: Promise<{ id: string }>;
};
export default async function EditorPage({ params }: Props) {
  const { id } = await params;

  // 在 headless 模式下，预览应跳转到主站（TRUSTED_ORIGINS）
  let previewUrl: string | undefined;
  try {
    const { env } = await getCloudflareContext({ async: true });
    if (env.HEADLESS_MODE === 'true' && env.TRUSTED_ORIGINS) {
      // TRUSTED_ORIGINS 可能包含多个域名，取第一个
      previewUrl = env.TRUSTED_ORIGINS.split(',')[0].trim();
    }
  } catch {
    // 开发环境可能无法获取 Cloudflare context
  }

  return (
    <ReactFlowProvider>
      <VisualEditor
        id={id}
        previewUrl={previewUrl}
      />
    </ReactFlowProvider>
  );
}
