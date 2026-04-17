'use client';

import { useEffect, useState } from 'react';

interface ImmersiveBackgroundProps {
  url?: string;
}

/**
 * 沉浸模式双层背景：
 * - 底层：模糊放大自身填满
 * - 上层：object-contain 居中，保持比例
 * 切换图片时 300ms 淡入，切走前的旧图继续在底层显示防止闪白。
 */
export default function ImmersiveBackground({ url }: ImmersiveBackgroundProps) {
  const [currentUrl, setCurrentUrl] = useState(url);
  const [prevUrl, setPrevUrl] = useState<string | undefined>(undefined);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (!url || url === currentUrl) return;
    setPrevUrl(currentUrl);
    setCurrentUrl(url);
    setFading(true);
    const timer = window.setTimeout(() => {
      setFading(false);
      setPrevUrl(undefined);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [url, currentUrl]);

  if (!currentUrl) {
    return <div className="absolute inset-0 bg-black" />;
  }

  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      {prevUrl && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={prevUrl}
            alt=""
            aria-hidden
            className="absolute inset-0 w-full h-full object-cover scale-125 blur-2xl opacity-70"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={prevUrl}
            alt=""
            aria-hidden
            className="absolute inset-0 w-full h-full object-contain"
          />
        </>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={currentUrl}
        alt=""
        aria-hidden
        className={`absolute inset-0 w-full h-full object-cover scale-125 blur-2xl opacity-70 transition-opacity duration-300 ${fading ? 'opacity-0' : 'opacity-70'}`}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={currentUrl}
        alt="Scene"
        className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-300 ${fading ? 'opacity-0' : 'opacity-100'}`}
      />
    </div>
  );
}
