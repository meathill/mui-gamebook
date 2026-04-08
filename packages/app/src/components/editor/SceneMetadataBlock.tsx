'use client';

import { useState, useRef, useEffect } from 'react';
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
  CheckIcon,
  XIcon,
  PlusIcon,
} from 'lucide-react';
import {
  parseSceneMetadata,
  hasMetadataContent,
  serializeSceneMetadata,
  type SceneMetadata,
} from '@/lib/editor/extensions/matchers';
import ImageLightbox from './ImageLightbox';

type SectionKey = 'image' | 'audio' | 'video' | 'minigame' | 'characters';

const AUDIO_TYPE_LABELS: Record<string, string> = {
  background_music: '背景音乐',
  sfx: '音效',
};

/**
 * 通用表单域组件
 */
function FormField({
  label,
  value,
  onChange,
  multiline,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  autoFocus?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement | HTMLInputElement>(null);
  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  return (
    <div className="smc-field">
      <label className="smc-field-label">{label}</label>
      {multiline ? (
        <textarea
          ref={ref as React.RefObject<HTMLTextAreaElement>}
          className="smc-field-input smc-field-textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
        />
      ) : (
        <input
          ref={ref as React.RefObject<HTMLInputElement>}
          className="smc-field-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="smc-field">
      <label className="smc-field-label">{label}</label>
      <select
        className="smc-field-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option
            key={o.value}
            value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * 保存/取消按钮组
 */
function FormActions({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) {
  return (
    <div className="smc-form-actions">
      <button
        type="button"
        className="smc-btn smc-btn-primary"
        onClick={onSave}>
        <CheckIcon size={12} />
        保存
      </button>
      <button
        type="button"
        className="smc-btn smc-btn-ghost"
        onClick={onCancel}>
        <XIcon size={12} />
        取消
      </button>
    </div>
  );
}

export default function SceneMetadataBlock({ node, editor, getPos }: NodeViewProps) {
  const isYaml = node.attrs.language === 'yaml';
  const [sourceMode, setSourceMode] = useState(false);
  const [editingSection, setEditingSection] = useState<SectionKey | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

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

  // 更新节点内容
  function updateContent(newMeta: SceneMetadata) {
    const pos = getPos();
    if (pos == null) return;
    const { tr, schema } = editor.view.state;
    const newText = serializeSceneMetadata(newMeta);
    tr.replaceWith(pos + 1, pos + node.nodeSize - 1, schema.text(newText));
    editor.view.dispatch(tr);
  }

  // 开始编辑某个区域
  function startEdit(section: SectionKey) {
    if (section === 'characters') {
      setEditForm({ characters: (metadata.characters || []).join(', ') });
    } else {
      const sectionData = metadata[section];
      const form: Record<string, string> = {};
      if (sectionData && typeof sectionData === 'object') {
        for (const [k, v] of Object.entries(sectionData)) {
          if (v != null) form[k] = String(v);
        }
      }
      setEditForm(form);
    }
    setEditingSection(section);
  }

  // 保存编辑
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
      updated.video = {
        prompt: editForm.prompt || undefined,
        url: editForm.url || undefined,
      };
    } else if (editingSection === 'minigame') {
      updated.minigame = {
        prompt: editForm.prompt || undefined,
        url: editForm.url || undefined,
      };
    }

    updateContent(updated);
    setEditingSection(null);
  }

  // 添加新的 section
  function addSection(type: 'video' | 'minigame') {
    const updated = structuredClone(metadata);
    if (type === 'video') updated.video = { prompt: '' };
    else updated.minigame = { prompt: '' };
    updateContent(updated);
    // 延迟进入编辑，等 node 内容更新
    setTimeout(() => startEdit(type), 0);
  }

  function setField(key: string, value: string) {
    setEditForm((prev) => ({ ...prev, [key]: value }));
  }

  // 无可识别元数据 或 源码模式
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

  // 区域编辑按钮
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
              <div className="smc-form">
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
                <FormActions
                  onSave={saveEdit}
                  onCancel={() => setEditingSection(null)}
                />
              </div>
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
              <div className="smc-form">
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
                <FormActions
                  onSave={saveEdit}
                  onCancel={() => setEditingSection(null)}
                />
              </div>
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
              <div className="smc-form">
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
                <FormActions
                  onSave={saveEdit}
                  onCancel={() => setEditingSection(null)}
                />
              </div>
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

      {/* 隐藏的可编辑内容 — ProseMirror 需要 contentDOM 存在 */}
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
