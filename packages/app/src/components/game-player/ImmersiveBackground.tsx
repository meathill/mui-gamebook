'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

interface ImmersiveBackgroundProps {
  url?: string;
}

/**
 * 沉浸模式双层背景：
 * - 底层：模糊放大自身填满
 * - 上层：object-contain 居中，保持比例
 * 切换图片时旧图立即卸载（黑屏），新图加载完成后 300ms 淡入——
 * 绝不在新图请好之前继续展示上一场景的图。
 */
export default function ImmersiveBackground({ url }: ImmersiveBackgroundProps) {
  // 已加载完成的 url：只有它才被渲染；切 url 时先回到黑屏
  const [loadedUrl, setLoadedUrl] = useState<string | undefined>(undefined);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
    // 同 url 不重置：同场景内翻页不闪黑
    if (url === loadedUrl) return;
    setLoadedUrl(undefined);
  }, [url]); // loadedUrl 不能进依赖数组：否则 setLoadedUrl 触发的重渲染会自我重入

  if (!url || failed) {
    return <div className="absolute inset-0 bg-black" />;
  }

  const ready = loadedUrl === url;

  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      {ready && (
        <div className="absolute inset-0 animate-fade-in">
          <Image
            src={url}
            alt=""
            aria-hidden
            fill
            className="object-cover scale-125 blur-2xl opacity-70"
            sizes="100vw"
          />
          <Image
            src={url}
            alt="场景插画"
            fill
            priority
            className="object-contain"
            sizes="100vw"
          />
        </div>
      )}
      {/* 预加载层：不可见，只负责把图请好后点亮 ready */}
      {!ready && (
        <Image
          src={url}
          alt=""
          aria-hidden
          fill
          className="opacity-0 pointer-events-none"
          sizes="100vw"
          onLoad={() => setLoadedUrl(url)}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
