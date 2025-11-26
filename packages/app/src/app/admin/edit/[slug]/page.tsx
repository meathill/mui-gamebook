import { ReactFlowProvider } from '@xyflow/react';
import VisualEditor from '@/components/editor/VisualEditor';

export default async function EditorPage({ params }: { params: { slug: string } }) {
  const { slug } = await params;

  return (
    <ReactFlowProvider>
      <VisualEditor slug={slug} />
    </ReactFlowProvider>
  );
}