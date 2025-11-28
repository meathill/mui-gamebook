import { ReactFlowProvider } from '@xyflow/react';
import VisualEditor from '@/components/editor/VisualEditor';

type Props = {
  params: Promise<{ id: string }>;
};
export default async function EditorPage({ params }: Props) {
  const { id } = await params;

  return (
    <ReactFlowProvider>
      <VisualEditor id={id} />
    </ReactFlowProvider>
  );
}
