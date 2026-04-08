/**
 * 场景元数据扩展
 *
 * 扩展 TipTap CodeBlock，为 language=yaml 的代码块
 * 提供可视化卡片渲染（图片/音频/视频/角色），
 * 替代原始 YAML 代码的直接展示。
 */
import CodeBlock from '@tiptap/extension-code-block';
import { ReactNodeViewRenderer } from '@tiptap/react';
import SceneMetadataBlock from '@/components/editor/SceneMetadataBlock';

export const SceneMetadata = CodeBlock.extend({
  name: 'codeBlock',

  addNodeView() {
    return ReactNodeViewRenderer(SceneMetadataBlock);
  },
});
