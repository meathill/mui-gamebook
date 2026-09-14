import { describe, expect, it } from 'vitest';
import { buildCloudflareImageUrl } from '../../image-loader';

const SRC = 'https://i.muistory.com/images/13/1766678019869.png';

describe('buildCloudflareImageUrl 超大图治理', () => {
  it('width=3840 限宽到 1920，不再请求 4K 原图', () => {
    const url = buildCloudflareImageUrl({ src: SRC, width: 3840 });
    expect(url).toContain('width=1920');
    expect(url).not.toContain('width=3840');
  });

  it('非法宽度回落 1200 默认值', () => {
    expect(buildCloudflareImageUrl({ src: SRC, width: Number.NaN })).toContain('width=1200');
    expect(buildCloudflareImageUrl({ src: SRC, width: 0 })).toContain('width=1200');
  });

  it('未传 quality 时默认 75，保证压缩参数始终存在', () => {
    const url = buildCloudflareImageUrl({ src: SRC, width: 400 });
    expect(url).toContain('width=400');
    expect(url).toContain('quality=75');
  });

  it('显式 quality 透传并截断到 1–100', () => {
    expect(buildCloudflareImageUrl({ src: SRC, width: 400, quality: 85 })).toContain('quality=85');
    expect(buildCloudflareImageUrl({ src: SRC, width: 400, quality: 200 })).toContain('quality=100');
  });

  it('data URI 与失效外链不走 cdn-cgi', () => {
    expect(buildCloudflareImageUrl({ src: 'data:image/png;base64,xxx', width: 400 })).toBe('data:image/png;base64,xxx');
    expect(buildCloudflareImageUrl({ src: 'https://picsum.photos/400', width: 400 })).toBe(
      '/images/placeholder-cover-400x600.png',
    );
  });
});
