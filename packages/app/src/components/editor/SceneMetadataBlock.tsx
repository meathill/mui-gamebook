'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { ImageIcon, Music2Icon, VideoIcon, GamepadIcon, UsersIcon, CodeIcon, EyeIcon, ZoomInIcon } from 'lucide-react';
import { parseSceneMetadata, hasMetadataContent } from '@/lib/editor/extensions/matchers';
import ImageLightbox from './ImageLightbox';

/**
 * 场景元数据代码块 — 自定义 NodeView
 *
 * YAML 代码块显示为可视化卡片，非 YAML 代码块保持原样。
 * 卡片模式下隐藏原始代码，提供「编辑源码」切换。
 */
export default function SceneMetadataBlock({ node }: NodeViewProps) {
  const isYaml = node.attrs.language === 'yaml';
  const [editing, setEditing] = useState(false);
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

  // 无可识别元数据 或 编辑模式 → 显示原始代码
  if (!hasContent || editing) {
    return (
      <NodeViewWrapper>
        <div className="scene-metadata-raw">
          {hasContent && (
            <div className="scene-metadata-bar">
              <button
                type="button"
                className="scene-metadata-toggle"
                onClick={() => setEditing(false)}>
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

  // 卡片模式
  return (
    <NodeViewWrapper>
      <div
        className="scene-metadata-card"
        contentEditable={false}>
        {/* 标题栏 */}
        <div className="scene-metadata-header">
          <span className="scene-metadata-title">场景素材</span>
          <button
            type="button"
            className="scene-metadata-toggle"
            onClick={() => setEditing(true)}>
            <CodeIcon size={12} />
            编辑源码
          </button>
        </div>

        {/* 图片区 */}
        {metadata.image && (
          <div className="scene-metadata-section">
            <div className="scene-metadata-label">
              <ImageIcon size={13} />
              场景图片
            </div>
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
          </div>
        )}

        {/* 音频区 */}
        {metadata.audio && (
          <div className="scene-metadata-section">
            <div className="scene-metadata-label">
              <Music2Icon size={13} />
              {metadata.audio.type === 'background_music' ? '背景音乐' : '音效'}
            </div>
            {metadata.audio.url && (
              <audio
                src={metadata.audio.url}
                controls
                preload="none"
                className="scene-metadata-audio"
              />
            )}
            {metadata.audio.prompt && <p className="scene-metadata-prompt">{metadata.audio.prompt}</p>}
          </div>
        )}

        {/* 视频区 */}
        {metadata.video && (
          <div className="scene-metadata-section">
            <div className="scene-metadata-label">
              <VideoIcon size={13} />
              场景视频
            </div>
            {metadata.video.url && (
              <video
                src={metadata.video.url}
                controls
                preload="none"
                className="scene-metadata-video"
              />
            )}
            {metadata.video.prompt && <p className="scene-metadata-prompt">{metadata.video.prompt}</p>}
          </div>
        )}

        {/* 小游戏区 */}
        {metadata.minigame && (
          <div className="scene-metadata-section">
            <div className="scene-metadata-label">
              <GamepadIcon size={13} />
              小游戏
            </div>
            {metadata.minigame.prompt && <p className="scene-metadata-prompt">{metadata.minigame.prompt}</p>}
          </div>
        )}

        {/* 角色区 */}
        {metadata.characters && metadata.characters.length > 0 && (
          <div className="scene-metadata-section">
            <div className="scene-metadata-label">
              <UsersIcon size={13} />
              出场角色
            </div>
            <div className="scene-metadata-chars">
              {metadata.characters.map((id) => (
                <span
                  key={id}
                  className="scene-metadata-char-tag">
                  {id}
                </span>
              ))}
            </div>
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
