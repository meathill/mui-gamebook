'use client';

import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import {
  ImageIcon,
  Music2Icon,
  VideoIcon,
  GamepadIcon,
  UsersIcon,
  CodeIcon,
  EyeIcon,
  ZoomInIcon,
  PencilIcon,
  PlusIcon,
  SparklesIcon,
  Loader2Icon,
} from 'lucide-react';
import {
  parseSceneMetadata,
  hasMetadataContent,
  serializeSceneMetadata,
  type SceneMetadata,
} from '@/lib/editor/extensions/matchers';
import type { SceneMetadataOptions } from '@/lib/editor/extensions/scene-metadata';
import { FormField, SelectField, FormActions } from './SceneMetadataForm';
import FileDropZone from './FileDropZone';
import ImageLightbox from './ImageLightbox';

type SectionKey = 'image' | 'audio' | 'video' | 'minigame' | 'characters';

const AUDIO_TYPE_LABELS: Record<string, string> = {
  background_music: '背景音乐',
  sfx: '音效',
};

export default function SceneMetadataBlock({ node, editor, getPos, extension }: NodeViewProps) {
  const isYaml = node.attrs.language === 'yaml';
  const gameId = (extension.options as SceneMetadataOptions).gameId;
  const uploadUrl = gameId ? `/api/cms/games/${gameId}/upload` : '';

  const [sourceMode, setSourceMode] = useState(false);
  const [editingSection, setEditingSection] = useState<SectionKey | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  // 非 YAML 代码块：保持原样
  if (!isYaml) {
    return (
      <NodeViewWrapper
        as="pre"
        className="scene-code-block">
        <NodeViewContent as={'code' as 'div'} />
      </NodeViewWrapper>
    );
  }

  const metadata = parseSceneMetadata(node.textContent);
  const hasContent = hasMetadataContent(metadata);

  function updateContent(newMeta: SceneMetadata) {
    const pos = getPos();
    if (pos == null) return;
    const { tr, schema } = editor.view.state;
    const newText = serializeSceneMetadata(newMeta);
    tr.replaceWith(pos + 1, pos + node.nodeSize - 1, schema.text(newText));
    editor.view.dispatch(tr);
  }

  function startEdit(section: SectionKey) {
    if (section === 'characters') {
      setEditForm({ characters: (metadata.characters || []).join(', ') });
    } else {
      const data = metadata[section];
      const form: Record<string, string> = {};
      if (data && typeof data === 'object') {
        for (const [k, v] of Object.entries(data)) {
          if (v != null) form[k] = String(v);
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

  function setField(key: string, value: string) {
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

  // 源码模式 / 无内容
  if (!hasContent || sourceMode) {
    return (
      <NodeViewWrapper>
        <div className="scene-metadata-raw">
          {hasContent && (
            <div className="scene-metadata-bar">
              <button
                type="button"
                className="scene-metadata-toggle"
                onClick={() => setSourceMode(false)}>
                <EyeIcon size={12} />
                预览
              </button>
            </div>
          )}
          <pre className="scene-code-block">
            <NodeViewContent as={'code' as 'div'} />
          </pre>
        </div>
      </NodeViewWrapper>
    );
  }

  function EditBtn({ section }: { section: SectionKey }) {
    return (
      <button
        type="button"
        className="smc-edit-btn"
        onClick={() => startEdit(section)}
        title="编辑">
        <PencilIcon size={12} />
      </button>
    );
  }

  // 图片编辑表单（含预览 + 上传 + AI 生成）
  function ImageEditForm() {
    return (
      <div className="smc-form">
        {/* 编辑时也显示已有图片 */}
        {editForm.url && (
          <div className="scene-metadata-image-wrap">
            <img
              src={editForm.url}
              alt="当前图片"
              className="scene-metadata-thumb"
              onClick={() => setLightboxUrl(editForm.url)}
            />
          </div>
        )}
        <FormField
          label="图片描述"
          value={editForm.prompt || ''}
          onChange={(v) => setField('prompt', v)}
          multiline
          autoFocus
        />
        <FormField
          label="图片地址"
          value={editForm.url || ''}
          onChange={(v) => setField('url', v)}
        />
        <FormField
          label="宽高比"
          value={editForm.aspectRatio || ''}
          onChange={(v) => setField('aspectRatio', v)}
        />
        {uploadUrl && (
          <FileDropZone
            uploadUrl={uploadUrl}
            assetType="scene"
            accept="image/*"
            onUploaded={handleUploaded}
            hint="点击或拖拽图片上传"
          />
        )}
        <div className="smc-form-actions">
          {gameId && (
            <button
              type="button"
              className="smc-btn smc-btn-ai"
              onClick={handleGenerate}
              disabled={generating || !editForm.prompt}>
              {generating ? (
                <Loader2Icon
                  size={12}
                  className="animate-spin"
                />
              ) : (
                <SparklesIcon size={12} />
              )}
              {generating ? '生成中...' : editForm.url ? '重新生成' : '生成图片'}
            </button>
          )}
          <FormActions
            onSave={saveEdit}
            onCancel={() => setEditingSection(null)}
          />
        </div>
      </div>
    );
  }

  // 音频编辑表单
  function AudioEditForm() {
    return (
      <div className="smc-form">
        {editForm.url && (
          <audio
            src={editForm.url}
            controls
            preload="none"
            className="scene-metadata-audio"
          />
        )}
        <SelectField
          label="音频类型"
          value={editForm.type || 'background_music'}
          onChange={(v) => setField('type', v)}
          options={[
            { value: 'background_music', label: '背景音乐' },
            { value: 'sfx', label: '音效' },
          ]}
        />
        <FormField
          label="音频描述"
          value={editForm.prompt || ''}
          onChange={(v) => setField('prompt', v)}
          multiline
          autoFocus
        />
        <FormField
          label="音频地址"
          value={editForm.url || ''}
          onChange={(v) => setField('url', v)}
        />
        {uploadUrl && (
          <FileDropZone
            uploadUrl={uploadUrl}
            assetType="audio"
            accept="audio/*"
            onUploaded={handleUploaded}
            hint="点击或拖拽音频上传"
          />
        )}
        <FormActions
          onSave={saveEdit}
          onCancel={() => setEditingSection(null)}
        />
      </div>
    );
  }

  // 视频编辑表单
  function VideoEditForm() {
    return (
      <div className="smc-form">
        {editForm.url && (
          <video
            src={editForm.url}
            controls
            preload="none"
            className="scene-metadata-video"
          />
        )}
        <FormField
          label="视频描述"
          value={editForm.prompt || ''}
          onChange={(v) => setField('prompt', v)}
          multiline
          autoFocus
        />
        <FormField
          label="视频地址"
          value={editForm.url || ''}
          onChange={(v) => setField('url', v)}
        />
        {uploadUrl && (
          <FileDropZone
            uploadUrl={uploadUrl}
            assetType="video"
            accept="video/*"
            onUploaded={handleUploaded}
            hint="点击或拖拽视频上传"
          />
        )}
        <FormActions
          onSave={saveEdit}
          onCancel={() => setEditingSection(null)}
        />
      </div>
    );
  }

  return (
    <NodeViewWrapper>
      <div
        className="scene-metadata-card"
        contentEditable={false}>
        {/* 标题栏 */}
        <div className="scene-metadata-header">
          <span className="scene-metadata-title">场景素材</span>
          <div className="smc-header-actions">
            {!metadata.video && (
              <button
                type="button"
                className="smc-add-btn"
                onClick={() => addSection('video')}>
                <PlusIcon size={12} />
                <VideoIcon size={12} />
                视频
              </button>
            )}
            {!metadata.minigame && (
              <button
                type="button"
                className="smc-add-btn"
                onClick={() => addSection('minigame')}>
                <PlusIcon size={12} />
                <GamepadIcon size={12} />
                小游戏
              </button>
            )}
            <button
              type="button"
              className="scene-metadata-toggle"
              onClick={() => setSourceMode(true)}
              title="高级：编辑源码">
              <CodeIcon size={12} />
            </button>
          </div>
        </div>

        {/* 图片区 */}
        {metadata.image && (
          <div className="scene-metadata-section">
            <div className="scene-metadata-label">
              <ImageIcon size={13} />
              场景图片
              {editingSection !== 'image' && <EditBtn section="image" />}
            </div>
            {editingSection === 'image' ? (
              <ImageEditForm />
            ) : (
              <>
                {metadata.image.url && (
                  <div className="scene-metadata-image-wrap">
                    <img
                      src={metadata.image.url}
                      alt="场景图片"
                      loading="lazy"
                      className="scene-metadata-thumb"
                      onClick={() => setLightboxUrl(metadata.image!.url!)}
                    />
                    <button
                      type="button"
                      className="scene-metadata-zoom"
                      onClick={() => setLightboxUrl(metadata.image!.url!)}>
                      <ZoomInIcon size={14} />
                    </button>
                  </div>
                )}
                {metadata.image.prompt && <p className="scene-metadata-prompt">{metadata.image.prompt}</p>}
              </>
            )}
          </div>
        )}

        {/* 音频区 */}
        {metadata.audio && (
          <div className="scene-metadata-section">
            <div className="scene-metadata-label">
              <Music2Icon size={13} />
              {AUDIO_TYPE_LABELS[metadata.audio.type || ''] || '音频'}
              {editingSection !== 'audio' && <EditBtn section="audio" />}
            </div>
            {editingSection === 'audio' ? (
              <AudioEditForm />
            ) : (
              <>
                {metadata.audio.url && (
                  <audio
                    src={metadata.audio.url}
                    controls
                    preload="none"
                    className="scene-metadata-audio"
                  />
                )}
                {metadata.audio.prompt && <p className="scene-metadata-prompt">{metadata.audio.prompt}</p>}
              </>
            )}
          </div>
        )}

        {/* 视频区 */}
        {metadata.video && (
          <div className="scene-metadata-section">
            <div className="scene-metadata-label">
              <VideoIcon size={13} />
              场景视频
              {editingSection !== 'video' && <EditBtn section="video" />}
            </div>
            {editingSection === 'video' ? (
              <VideoEditForm />
            ) : (
              <>
                {metadata.video.url && (
                  <video
                    src={metadata.video.url}
                    controls
                    preload="none"
                    className="scene-metadata-video"
                  />
                )}
                {metadata.video.prompt && <p className="scene-metadata-prompt">{metadata.video.prompt}</p>}
              </>
            )}
          </div>
        )}

        {/* 小游戏区 */}
        {metadata.minigame && (
          <div className="scene-metadata-section">
            <div className="scene-metadata-label">
              <GamepadIcon size={13} />
              小游戏
              {editingSection !== 'minigame' && <EditBtn section="minigame" />}
            </div>
            {editingSection === 'minigame' ? (
              <div className="smc-form">
                <FormField
                  label="游戏描述"
                  value={editForm.prompt || ''}
                  onChange={(v) => setField('prompt', v)}
                  multiline
                  autoFocus
                />
                <FormField
                  label="游戏地址"
                  value={editForm.url || ''}
                  onChange={(v) => setField('url', v)}
                />
                <FormActions
                  onSave={saveEdit}
                  onCancel={() => setEditingSection(null)}
                />
              </div>
            ) : (
              <>{metadata.minigame.prompt && <p className="scene-metadata-prompt">{metadata.minigame.prompt}</p>}</>
            )}
          </div>
        )}

        {/* 角色区 */}
        {metadata.characters && metadata.characters.length > 0 && (
          <div className="scene-metadata-section">
            <div className="scene-metadata-label">
              <UsersIcon size={13} />
              出场角色
              {editingSection !== 'characters' && <EditBtn section="characters" />}
            </div>
            {editingSection === 'characters' ? (
              <div className="smc-form">
                <FormField
                  label="角色 ID（逗号分隔）"
                  value={editForm.characters || ''}
                  onChange={(v) => setField('characters', v)}
                  autoFocus
                />
                <FormActions
                  onSave={saveEdit}
                  onCancel={() => setEditingSection(null)}
                />
              </div>
            ) : (
              <div className="scene-metadata-chars">
                {metadata.characters.map((id) => (
                  <span
                    key={id}
                    className="scene-metadata-char-tag">
                    {id}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 隐藏的可编辑内容 */}
      <div className="scene-metadata-hidden-content">
        <pre>
          <NodeViewContent as={'code' as 'div'} />
        </pre>
      </div>

      {/* 图片放大 Lightbox */}
      {lightboxUrl &&
        createPortal(
          <ImageLightbox
            src={lightboxUrl}
            onClose={() => setLightboxUrl(null)}
          />,
          document.body,
        )}
    </NodeViewWrapper>
  );
}
