'use client';

import { PencilIcon, SparkleIcon, SpinnerIcon } from '@phosphor-icons/react';
import FileDropZone from './FileDropZone';
import { FormActions, FormField, SelectField } from './SceneMetadataForm';

export type SceneMetadataSectionKey = 'image' | 'audio' | 'video' | 'minigame' | 'characters';
export type SceneMetadataFieldKey = 'prompt' | 'url' | 'aspectRatio' | 'type' | 'characters';
export type SceneMetadataEditForm = Partial<Record<SceneMetadataFieldKey, string>>;

interface EditButtonProps {
  section: SceneMetadataSectionKey;
  onEdit: (section: SceneMetadataSectionKey) => void;
}

interface EditFormProps {
  editForm: SceneMetadataEditForm;
  uploadUrl: string;
  onFieldChange: (key: SceneMetadataFieldKey, value: string) => void;
  onUploaded: (url: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

interface ImageEditFormProps extends EditFormProps {
  canGenerate: boolean;
  isGenerating: boolean;
  onGenerate: () => void | Promise<void>;
  onImageClick: (url: string) => void;
}

const AUDIO_TYPE_OPTIONS = [
  { value: 'background_music', label: '背景音乐' },
  { value: 'sfx', label: '音效' },
];

export function EditButton({ section, onEdit }: EditButtonProps) {
  return (
    <button
      type="button"
      className="smc-edit-btn"
      onClick={() => onEdit(section)}
      title="编辑">
      <PencilIcon size={12} />
    </button>
  );
}

export function ImageEditForm({
  editForm,
  uploadUrl,
  canGenerate,
  isGenerating,
  onFieldChange,
  onUploaded,
  onGenerate,
  onImageClick,
  onSave,
  onCancel,
}: ImageEditFormProps) {
  const imageUrl = editForm.url;

  return (
    <div className="smc-form">
      {imageUrl && (
        <div className="scene-metadata-image-wrap">
          <img
            src={imageUrl}
            alt="当前图片"
            className="scene-metadata-thumb"
            onClick={() => onImageClick(imageUrl)}
          />
        </div>
      )}
      <FormField
        label="图片描述"
        value={editForm.prompt || ''}
        onChange={(value) => onFieldChange('prompt', value)}
        multiline
        autoFocus
      />
      <FormField
        label="图片地址"
        value={editForm.url || ''}
        onChange={(value) => onFieldChange('url', value)}
      />
      <FormField
        label="宽高比"
        value={editForm.aspectRatio || ''}
        onChange={(value) => onFieldChange('aspectRatio', value)}
      />
      {uploadUrl && (
        <FileDropZone
          uploadUrl={uploadUrl}
          assetType="scene"
          accept="image/*"
          onUploaded={onUploaded}
          hint="点击或拖拽图片上传"
        />
      )}
      <div className="smc-form-actions">
        {canGenerate && (
          <button
            type="button"
            className="smc-btn smc-btn-ai"
            onClick={onGenerate}
            disabled={isGenerating || !editForm.prompt}>
            {isGenerating ? (
              <SpinnerIcon
                size={12}
                className="animate-spin"
              />
            ) : (
              <SparkleIcon size={12} />
            )}
            {isGenerating ? '生成中...' : editForm.url ? '重新生成' : '生成图片'}
          </button>
        )}
        <FormActions
          onSave={onSave}
          onCancel={onCancel}
        />
      </div>
    </div>
  );
}

export function AudioEditForm({ editForm, uploadUrl, onFieldChange, onUploaded, onSave, onCancel }: EditFormProps) {
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
        onChange={(value) => onFieldChange('type', value)}
        options={AUDIO_TYPE_OPTIONS}
      />
      <FormField
        label="音频描述"
        value={editForm.prompt || ''}
        onChange={(value) => onFieldChange('prompt', value)}
        multiline
        autoFocus
      />
      <FormField
        label="音频地址"
        value={editForm.url || ''}
        onChange={(value) => onFieldChange('url', value)}
      />
      {uploadUrl && (
        <FileDropZone
          uploadUrl={uploadUrl}
          assetType="audio"
          accept="audio/*"
          onUploaded={onUploaded}
          hint="点击或拖拽音频上传"
        />
      )}
      <FormActions
        onSave={onSave}
        onCancel={onCancel}
      />
    </div>
  );
}

export function VideoEditForm({ editForm, uploadUrl, onFieldChange, onUploaded, onSave, onCancel }: EditFormProps) {
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
        onChange={(value) => onFieldChange('prompt', value)}
        multiline
        autoFocus
      />
      <FormField
        label="视频地址"
        value={editForm.url || ''}
        onChange={(value) => onFieldChange('url', value)}
      />
      {uploadUrl && (
        <FileDropZone
          uploadUrl={uploadUrl}
          assetType="video"
          accept="video/*"
          onUploaded={onUploaded}
          hint="点击或拖拽视频上传"
        />
      )}
      <FormActions
        onSave={onSave}
        onCancel={onCancel}
      />
    </div>
  );
}
