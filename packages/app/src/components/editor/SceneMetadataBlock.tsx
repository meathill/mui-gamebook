'use client';

import { createPortal } from 'react-dom';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { GameControllerIcon, VideoIcon, CodeIcon, EyeIcon, PlusIcon } from '@phosphor-icons/react';
import type { SceneMetadataOptions } from '@/lib/editor/extensions/scene-metadata';
import { useSceneMetadataEditor } from '@/lib/editor/useSceneMetadataEditor';
import ImageLightbox from './ImageLightbox';
import {
  AudioSection,
  CharactersSection,
  ImageSection,
  MinigameSection,
  VideoSection,
} from './scene-metadata-sections';

export default function SceneMetadataBlock({ node, editor, getPos, extension }: NodeViewProps) {
  const isYaml = node.attrs.language === 'yaml';
  const gameId = (extension.options as SceneMetadataOptions).gameId;
  const uploadUrl = gameId ? `/api/cms/games/${gameId}/upload` : '';

  const {
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
  } = useSceneMetadataEditor({ node, editor, getPos, gameId });

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

  const cancelEdit = () => setEditingSection(null);

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
                <GameControllerIcon size={12} />
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

        <ImageSection
          image={metadata.image}
          editingSection={editingSection}
          editForm={editForm}
          uploadUrl={uploadUrl}
          canGenerate={Boolean(gameId)}
          isGenerating={generating}
          onEdit={startEdit}
          onFieldChange={setField}
          onUploaded={handleUploaded}
          onGenerate={handleGenerate}
          onImageClick={setLightboxUrl}
          onSave={saveEdit}
          onCancel={cancelEdit}
        />

        <AudioSection
          audio={metadata.audio}
          editingSection={editingSection}
          editForm={editForm}
          uploadUrl={uploadUrl}
          onEdit={startEdit}
          onFieldChange={setField}
          onUploaded={handleUploaded}
          onSave={saveEdit}
          onCancel={cancelEdit}
        />

        <VideoSection
          video={metadata.video}
          editingSection={editingSection}
          editForm={editForm}
          uploadUrl={uploadUrl}
          onEdit={startEdit}
          onFieldChange={setField}
          onUploaded={handleUploaded}
          onSave={saveEdit}
          onCancel={cancelEdit}
        />

        <MinigameSection
          minigame={metadata.minigame}
          editingSection={editingSection}
          editForm={editForm}
          onEdit={startEdit}
          onFieldChange={setField}
          onSave={saveEdit}
          onCancel={cancelEdit}
        />

        <CharactersSection
          characters={metadata.characters}
          editingSection={editingSection}
          editForm={editForm}
          onEdit={startEdit}
          onFieldChange={setField}
          onSave={saveEdit}
          onCancel={cancelEdit}
        />
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
