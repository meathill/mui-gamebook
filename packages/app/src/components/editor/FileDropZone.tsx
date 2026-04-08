'use client';

import { useState, useRef, useCallback } from 'react';
import { UploadCloudIcon, Loader2Icon } from 'lucide-react';

interface FileDropZoneProps {
  /** 上传 API 地址 */
  uploadUrl: string;
  /** 资源类型，传给后端 */
  assetType: 'scene' | 'audio' | 'video';
  /** 接受的文件类型 MIME */
  accept: string;
  /** 上传成功回调，返回 URL */
  onUploaded: (url: string) => void;
  /** 提示文字 */
  hint?: string;
}

export default function FileDropZone({ uploadUrl, assetType, accept, onUploaded, hint }: FileDropZoneProps) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = useCallback(
    async (file: File) => {
      setUploading(true);
      setError(null);
      try {
        const form = new FormData();
        form.append('file', file);
        form.append('type', assetType);
        const res = await fetch(uploadUrl, { method: 'POST', body: form });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error || `上传失败 (${res.status})`);
        }
        const result = (await res.json()) as { url: string };
        onUploaded(result.url);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setUploading(false);
      }
    },
    [uploadUrl, assetType, onUploaded],
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) upload(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) upload(file);
    // 重置 input 允许重复选择同一文件
    e.target.value = '';
  }

  return (
    <div
      className={`smc-dropzone ${dragging ? 'smc-dropzone-active' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleFileChange}
      />
      {uploading ? (
        <div className="smc-dropzone-status">
          <Loader2Icon
            size={16}
            className="animate-spin"
          />
          <span>上传中...</span>
        </div>
      ) : (
        <div className="smc-dropzone-status">
          <UploadCloudIcon size={16} />
          <span>{hint || '点击或拖拽文件上传'}</span>
        </div>
      )}
      {error && <p className="smc-dropzone-error">{error}</p>}
    </div>
  );
}
