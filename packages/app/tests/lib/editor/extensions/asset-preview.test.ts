import { describe, it, expect } from 'vitest';
import { extractAssetUrl } from '@/lib/editor/extensions/matchers';

describe('extractAssetUrl', () => {
  it('提取图片 URL', () => {
    const yaml = 'image:\n  prompt: "城堡入口"\n  url: https://i.example.com/castle.webp';
    const result = extractAssetUrl(yaml);
    expect(result).toEqual({
      url: 'https://i.example.com/castle.webp',
      assetType: 'image',
    });
  });

  it('提取音频 URL', () => {
    const yaml = 'audio:\n  type: background_music\n  prompt: "紧张的氛围"\n  url: https://a.example.com/tension.mp3';
    const result = extractAssetUrl(yaml);
    expect(result).toEqual({
      url: 'https://a.example.com/tension.mp3',
      assetType: 'audio',
    });
  });

  it('提取视频 URL', () => {
    const yaml = 'video:\n  prompt: "开场动画"\n  url: https://v.example.com/intro.mp4';
    const result = extractAssetUrl(yaml);
    expect(result).toEqual({
      url: 'https://v.example.com/intro.mp4',
      assetType: 'video',
    });
  });

  it('通过文件扩展名推断图片类型', () => {
    const yaml = 'url: https://cdn.example.com/photo.png';
    const result = extractAssetUrl(yaml);
    expect(result?.assetType).toBe('image');
  });

  it('通过文件扩展名推断音频类型', () => {
    const yaml = 'url: https://cdn.example.com/sound.wav';
    const result = extractAssetUrl(yaml);
    expect(result?.assetType).toBe('audio');
  });

  it('没有 URL 返回 null', () => {
    const yaml = 'image:\n  prompt: "还没生成"';
    const result = extractAssetUrl(yaml);
    expect(result).toBeNull();
  });

  it('空文本返回 null', () => {
    expect(extractAssetUrl('')).toBeNull();
  });

  it('URL 后无扩展名且无类型关键字返回 unknown', () => {
    const yaml = 'url: https://cdn.example.com/asset';
    const result = extractAssetUrl(yaml);
    expect(result?.assetType).toBe('unknown');
  });

  it('处理带查询参数的 URL', () => {
    const yaml = 'image:\n  url: https://i.example.com/img.webp?v=123';
    const result = extractAssetUrl(yaml);
    expect(result?.url).toBe('https://i.example.com/img.webp?v=123');
    expect(result?.assetType).toBe('image');
  });
});
