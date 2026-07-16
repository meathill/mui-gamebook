import { useState, useCallback } from 'react';
import type { NodeViewProps } from '@tiptap/react';
import {
  parseSceneMetadata,
  hasMetadataContent,
  serializeSceneMetadata,
  type SceneMetadata,
} from '@/lib/editor/scene-metadata-yaml';
import type {
  SceneMetadataEditForm,
  SceneMetadataFieldKey,
  SceneMetadataSectionKey,
} from '@/components/editor/scene-metadata-edit-forms';

type UseSceneMetadataEditorParams = Pick<NodeViewProps, 'node' | 'editor' | 'getPos'> & {
  gameId: string | undefined;
};

/**
 * SceneMetadataBlock 的状态与编辑逻辑：解析/序列化场景元数据、
 * 编辑表单状态、上传回填、AI 生图。
 */
export function useSceneMetadataEditor({ node, editor, getPos, gameId }: UseSceneMetadataEditorParams) {
  const [sourceMode, setSourceMode] = useState(false);
  const [editingSection, setEditingSection] = useState<SceneMetadataSectionKey | null>(null);
  const [editForm, setEditForm] = useState<SceneMetadataEditForm>({});
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const metadata = parseSceneMetadata(node.textContent);
  const hasContent = hasMetadataContent(metadata);

  function updateContent(newMeta: SceneMetadata) {
    const pos = getPos();
    if (pos == null) return;
    const { tr, schema } = editor.view.state;
    const newText = serializeSceneMetadata(newMeta, node.textContent);
    // ProseMirror 不允许空 text node，全清空时直接清空块内容
    tr.replaceWith(pos + 1, pos + node.nodeSize - 1, newText ? schema.text(newText) : []);
    editor.view.dispatch(tr);
  }

  function startEdit(section: SceneMetadataSectionKey) {
    if (section === 'characters') {
      setEditForm({ characters: (metadata.characters || []).join(', ') });
    } else {
      const data = metadata[section];
      const form: SceneMetadataEditForm = {};
      if (data && typeof data === 'object') {
        for (const [k, v] of Object.entries(data)) {
          if (v != null) form[k as SceneMetadataFieldKey] = String(v);
        }
      }
      setEditForm(form);
    }
    setEditingSection(section);
  }

  function saveEdit() {
    if (!editingSection) return;
    const updated = structuredClone(metadata);
    if (editingSection === 'characters') {
      updated.characters = editForm.characters
        ? editForm.characters
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [];
    } else if (editingSection === 'image') {
      updated.image = {
        prompt: editForm.prompt || undefined,
        url: editForm.url || undefined,
        aspectRatio: editForm.aspectRatio || undefined,
      };
    } else if (editingSection === 'audio') {
      updated.audio = {
        type: editForm.type || undefined,
        prompt: editForm.prompt || undefined,
        url: editForm.url || undefined,
      };
    } else if (editingSection === 'video') {
      updated.video = { prompt: editForm.prompt || undefined, url: editForm.url || undefined };
    } else if (editingSection === 'minigame') {
      updated.minigame = { prompt: editForm.prompt || undefined, url: editForm.url || undefined };
    }
    updateContent(updated);
    setEditingSection(null);
  }

  function addSection(type: 'video' | 'minigame') {
    const updated = structuredClone(metadata);
    if (type === 'video') updated.video = { prompt: '' };
    else updated.minigame = { prompt: '' };
    updateContent(updated);
    setTimeout(() => startEdit(type), 0);
  }

  function setField(key: SceneMetadataFieldKey, value: string) {
    setEditForm((prev) => ({ ...prev, [key]: value }));
  }

  // 上传成功后更新 url 字段
  const handleUploaded = useCallback((url: string) => {
    setEditForm((prev) => ({ ...prev, url }));
  }, []);

  // AI 生成图片
  async function handleGenerate() {
    const prompt = editForm.prompt;
    if (!prompt || !gameId) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/cms/assets/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          gameId,
          type: 'ai_image',
          aspectRatio: editForm.aspectRatio || undefined,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || `生成失败 (${res.status})`);
      }
      const result = (await res.json()) as { url: string };
      const { url } = result;
      setEditForm((prev) => ({ ...prev, url }));
    } catch (e) {
      console.error('AI 生成失败:', e);
    } finally {
      setGenerating(false);
    }
  }

  return {
    sourceMode,
    setSourceMode,
    editingSection,
    setEditingSection,
    editForm,
    lightboxUrl,
    setLightboxUrl,
    generating,
    metadata,
    hasContent,
    startEdit,
    saveEdit,
    addSection,
    setField,
    handleUploaded,
    handleGenerate,
  };
}
