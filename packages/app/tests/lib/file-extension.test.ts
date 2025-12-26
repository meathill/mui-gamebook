import { describe, it, expect } from 'vitest';
import { getExtensionForMimeType, fixFileExtension } from '@/lib/ai-service';

describe('getExtensionForMimeType', () => {
  it('应该返回音频类型的正确扩展名', () => {
    expect(getExtensionForMimeType('audio/wav')).toBe('.wav');
    expect(getExtensionForMimeType('audio/mpeg')).toBe('.mp3');
    expect(getExtensionForMimeType('audio/mp3')).toBe('.mp3');
    expect(getExtensionForMimeType('audio/ogg')).toBe('.ogg');
    expect(getExtensionForMimeType('audio/pcm')).toBe('.wav'); // PCM 转 WAV
  });

  it('应该返回图片类型的正确扩展名', () => {
    expect(getExtensionForMimeType('image/png')).toBe('.png');
    expect(getExtensionForMimeType('image/jpeg')).toBe('.jpg');
    expect(getExtensionForMimeType('image/webp')).toBe('.webp');
    expect(getExtensionForMimeType('image/gif')).toBe('.gif');
  });

  it('应该返回视频类型的正确扩展名', () => {
    expect(getExtensionForMimeType('video/mp4')).toBe('.mp4');
    expect(getExtensionForMimeType('video/webm')).toBe('.webm');
  });

  it('对于未知类型应该返回空字符串', () => {
    expect(getExtensionForMimeType('unknown/type')).toBe('');
    expect(getExtensionForMimeType('')).toBe('');
  });
});

describe('fixFileExtension', () => {
  it('应该替换错误的扩展名为正确的扩展名', () => {
    // WAV 文件名但实际是 MP3
    expect(fixFileExtension('audio/test.wav', 'audio/mpeg')).toBe('audio/test.mp3');
    // PNG 文件名但实际是 JPEG
    expect(fixFileExtension('images/photo.png', 'image/jpeg')).toBe('images/photo.jpg');
  });

  it('应该保持正确的扩展名不变', () => {
    expect(fixFileExtension('audio/test.mp3', 'audio/mpeg')).toBe('audio/test.mp3');
    expect(fixFileExtension('images/photo.png', 'image/png')).toBe('images/photo.png');
  });

  it('应该为没有扩展名的文件添加扩展名', () => {
    expect(fixFileExtension('audio/test', 'audio/mpeg')).toBe('audio/test.mp3');
    expect(fixFileExtension('images/photo', 'image/png')).toBe('images/photo.png');
  });

  it('对于未知类型应该返回原文件名', () => {
    expect(fixFileExtension('file.txt', 'unknown/type')).toBe('file.txt');
  });

  it('应该正确处理带有多个点的文件名', () => {
    expect(fixFileExtension('audio/my.song.name.wav', 'audio/mpeg')).toBe('audio/my.song.name.mp3');
  });

  it('应该正确处理路径中的点', () => {
    // 目录名带点，文件名无扩展名
    expect(fixFileExtension('audio/v1.0/test', 'audio/wav')).toBe('audio/v1.0/test.wav');
  });
});
