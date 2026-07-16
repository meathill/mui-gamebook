'use client';

import {
  ImageIcon,
  MusicNoteIcon,
  VideoIcon,
  GameControllerIcon,
  UsersIcon,
  MagnifyingGlassPlusIcon,
} from '@phosphor-icons/react';
import type { SceneMetadata } from '@/lib/editor/scene-metadata-yaml';
import { FormActions, FormField } from './SceneMetadataForm';
import {
  AudioEditForm,
  EditButton,
  ImageEditForm,
  VideoEditForm,
  type SceneMetadataEditForm,
  type SceneMetadataFieldKey,
  type SceneMetadataSectionKey,
} from './scene-metadata-edit-forms';

const AUDIO_TYPE_LABELS: Record<string, string> = {
  background_music: '背景音乐',
  sfx: '音效',
};

interface SectionCommonProps {
  editingSection: SceneMetadataSectionKey | null;
  editForm: SceneMetadataEditForm;
  uploadUrl: string;
  onEdit: (section: SceneMetadataSectionKey) => void;
  onFieldChange: (key: SceneMetadataFieldKey, value: string) => void;
  onUploaded: (url: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

interface ImageSectionProps extends SectionCommonProps {
  image: SceneMetadata['image'];
  canGenerate: boolean;
  isGenerating: boolean;
  onGenerate: () => void | Promise<void>;
  onImageClick: (url: string) => void;
}

export function ImageSection({
  image,
  editingSection,
  editForm,
  uploadUrl,
  canGenerate,
  isGenerating,
  onEdit,
  onFieldChange,
  onUploaded,
  onGenerate,
  onImageClick,
  onSave,
  onCancel,
}: ImageSectionProps) {
  if (!image) return null;
  return (
    <div className="scene-metadata-section">
      <div className="scene-metadata-label">
        <ImageIcon size={13} />
        场景图片
        {editingSection !== 'image' && (
          <EditButton
            section="image"
            onEdit={onEdit}
          />
        )}
      </div>
      {editingSection === 'image' ? (
        <ImageEditForm
          editForm={editForm}
          uploadUrl={uploadUrl}
          canGenerate={canGenerate}
          isGenerating={isGenerating}
          onFieldChange={onFieldChange}
          onUploaded={onUploaded}
          onGenerate={onGenerate}
          onImageClick={onImageClick}
          onSave={onSave}
          onCancel={onCancel}
        />
      ) : (
        <>
          {image.url && (
            <div className="scene-metadata-image-wrap">
              <img
                src={image.url}
                alt="场景图片"
                loading="lazy"
                className="scene-metadata-thumb"
                onClick={() => onImageClick(image.url!)}
              />
              <button
                type="button"
                className="scene-metadata-zoom"
                onClick={() => onImageClick(image.url!)}>
                <MagnifyingGlassPlusIcon size={14} />
              </button>
            </div>
          )}
          {image.prompt && <p className="scene-metadata-prompt">{image.prompt}</p>}
        </>
      )}
    </div>
  );
}

interface AudioSectionProps extends SectionCommonProps {
  audio: SceneMetadata['audio'];
}

export function AudioSection({
  audio,
  editingSection,
  editForm,
  uploadUrl,
  onEdit,
  onFieldChange,
  onUploaded,
  onSave,
  onCancel,
}: AudioSectionProps) {
  if (!audio) return null;
  return (
    <div className="scene-metadata-section">
      <div className="scene-metadata-label">
        <MusicNoteIcon size={13} />
        {AUDIO_TYPE_LABELS[audio.type || ''] || '音频'}
        {editingSection !== 'audio' && (
          <EditButton
            section="audio"
            onEdit={onEdit}
          />
        )}
      </div>
      {editingSection === 'audio' ? (
        <AudioEditForm
          editForm={editForm}
          uploadUrl={uploadUrl}
          onFieldChange={onFieldChange}
          onUploaded={onUploaded}
          onSave={onSave}
          onCancel={onCancel}
        />
      ) : (
        <>
          {audio.url && (
            <audio
              src={audio.url}
              controls
              preload="none"
              className="scene-metadata-audio"
            />
          )}
          {audio.prompt && <p className="scene-metadata-prompt">{audio.prompt}</p>}
        </>
      )}
    </div>
  );
}

interface VideoSectionProps extends SectionCommonProps {
  video: SceneMetadata['video'];
}

export function VideoSection({
  video,
  editingSection,
  editForm,
  uploadUrl,
  onEdit,
  onFieldChange,
  onUploaded,
  onSave,
  onCancel,
}: VideoSectionProps) {
  if (!video) return null;
  return (
    <div className="scene-metadata-section">
      <div className="scene-metadata-label">
        <VideoIcon size={13} />
        场景视频
        {editingSection !== 'video' && (
          <EditButton
            section="video"
            onEdit={onEdit}
          />
        )}
      </div>
      {editingSection === 'video' ? (
        <VideoEditForm
          editForm={editForm}
          uploadUrl={uploadUrl}
          onFieldChange={onFieldChange}
          onUploaded={onUploaded}
          onSave={onSave}
          onCancel={onCancel}
        />
      ) : (
        <>
          {video.url && (
            <video
              src={video.url}
              controls
              preload="none"
              className="scene-metadata-video"
            />
          )}
          {video.prompt && <p className="scene-metadata-prompt">{video.prompt}</p>}
        </>
      )}
    </div>
  );
}

interface MinigameSectionProps {
  minigame: SceneMetadata['minigame'];
  editingSection: SceneMetadataSectionKey | null;
  editForm: SceneMetadataEditForm;
  onEdit: (section: SceneMetadataSectionKey) => void;
  onFieldChange: (key: SceneMetadataFieldKey, value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function MinigameSection({
  minigame,
  editingSection,
  editForm,
  onEdit,
  onFieldChange,
  onSave,
  onCancel,
}: MinigameSectionProps) {
  if (!minigame) return null;
  return (
    <div className="scene-metadata-section">
      <div className="scene-metadata-label">
        <GameControllerIcon size={13} />
        小游戏
        {editingSection !== 'minigame' && (
          <EditButton
            section="minigame"
            onEdit={onEdit}
          />
        )}
      </div>
      {editingSection === 'minigame' ? (
        <div className="smc-form">
          <FormField
            label="游戏描述"
            value={editForm.prompt || ''}
            onChange={(v) => onFieldChange('prompt', v)}
            multiline
            autoFocus
          />
          <FormField
            label="游戏地址"
            value={editForm.url || ''}
            onChange={(v) => onFieldChange('url', v)}
          />
          <FormActions
            onSave={onSave}
            onCancel={onCancel}
          />
        </div>
      ) : (
        <>{minigame.prompt && <p className="scene-metadata-prompt">{minigame.prompt}</p>}</>
      )}
    </div>
  );
}

interface CharactersSectionProps {
  characters: SceneMetadata['characters'];
  editingSection: SceneMetadataSectionKey | null;
  editForm: SceneMetadataEditForm;
  onEdit: (section: SceneMetadataSectionKey) => void;
  onFieldChange: (key: SceneMetadataFieldKey, value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function CharactersSection({
  characters,
  editingSection,
  editForm,
  onEdit,
  onFieldChange,
  onSave,
  onCancel,
}: CharactersSectionProps) {
  if (!characters || characters.length === 0) return null;
  return (
    <div className="scene-metadata-section">
      <div className="scene-metadata-label">
        <UsersIcon size={13} />
        出场角色
        {editingSection !== 'characters' && (
          <EditButton
            section="characters"
            onEdit={onEdit}
          />
        )}
      </div>
      {editingSection === 'characters' ? (
        <div className="smc-form">
          <FormField
            label="角色 ID（逗号分隔）"
            value={editForm.characters || ''}
            onChange={(v) => onFieldChange('characters', v)}
            autoFocus
          />
          <FormActions
            onSave={onSave}
            onCancel={onCancel}
          />
        </div>
      ) : (
        <div className="scene-metadata-chars">
          {characters.map((id) => (
            <span
              key={id}
              className="scene-metadata-char-tag">
              {id}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
