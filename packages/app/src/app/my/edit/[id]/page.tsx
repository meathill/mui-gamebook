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
    // 见 app/page.tsx 里的同款注释：加宽字面量类型，避免部署环境把 HEADLESS_MODE/TRUSTED_ORIGINS
    // 改成非默认值时报类型错误（wrangler.jsonc 里两者的默认值分别是 "false"/""，会被推断成字面量类型）
    const trustedOrigins = env.TRUSTED_ORIGINS as string;
    if ((env.HEADLESS_MODE as string) === 'true' && trustedOrigins) {
      // TRUSTED_ORIGINS 可能包含多个域名，取第一个
      previewUrl = trustedOrigins.split(',')[0].trim();
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
