'use client';

interface SceneImageProps {
  url: string;
  loading: boolean;
  onLoad: () => void;
}

/**
 * 场景图片组件
 */
export default function SceneImage({ url, loading, onLoad }: SceneImageProps) {
  return (
    <div className="w-full aspect-video relative overflow-hidden bg-primary-light/30 shadow-inner max-h-[50vh]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt="场景图片"
        className={`object-contain w-full h-full transition-opacity duration-500 ${loading ? 'opacity-50' : 'opacity-100'}`}
        onLoad={onLoad}
      />
    </div>
  );
}
