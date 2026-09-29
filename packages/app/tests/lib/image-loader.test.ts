import { describe, expect, it } from 'vitest';
import { buildCloudflareImageUrl, buildOptimizedImageUrl } from '../../image-loader';

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

  it('支持自身 Cloudflare 缩放的外域 CDN（如 i.muicv.com）由其自身域名节点就近缩放', () => {
    const muicvUrl = 'https://i.muicv.com/blog/ai-agent-gamebook-creation-guide/cover.jpg';
    const result = buildCloudflareImageUrl({ src: muicvUrl, width: 768, quality: 75 });
    expect(result).toBe(
      'https://i.muicv.com/cdn-cgi/image/fit=scale-down,format=auto,width=768,quality=75/https://i.muicv.com/blog/ai-agent-gamebook-creation-guide/cover.jpg',
    );
  });

  it('未知或无自身缩放能力的跨域资源保持原 URL，避免 Cloudflare 403 裂图', () => {
    const unknownExternalUrl = 'https://images.example.com/demo.png';
    expect(buildCloudflareImageUrl({ src: unknownExternalUrl, width: 768 })).toBe(unknownExternalUrl);
  });

  it('避免对已带 /cdn-cgi/image/ 的 URL 进行二次重复嵌套', () => {
    const alreadyResized =
      'https://i.muicv.com/cdn-cgi/image/fit=scale-down,format=auto,width=768,quality=75/https://i.muicv.com/cover.jpg';
    expect(buildCloudflareImageUrl({ src: alreadyResized, width: 1280 })).toBe(alreadyResized);
  });

  it('相对路径与同一 Cloudflare Zone 域名走 cdn-cgi 缩放', () => {
    const relativeUrl = '/hero-bg.png';
    const relativeResult = buildCloudflareImageUrl({ src: relativeUrl, width: 768, quality: 75 });
    expect(relativeResult).toBe('/cdn-cgi/image/fit=scale-down,format=auto,width=768,quality=75/hero-bg.png');

    const apexResult = buildCloudflareImageUrl({ src: 'https://muistory.com/hero-bg.png', width: 768 });
    expect(apexResult).toContain('/cdn-cgi/image/');
    expect(apexResult).toContain('https://muistory.com/hero-bg.png');
  });
});

describe('buildOptimizedImageUrl Markdown 配图优化辅助函数', () => {
  it('为空值返回空字符串', () => {
    expect(buildOptimizedImageUrl(null)).toBe('');
    expect(buildOptimizedImageUrl('')).toBe('');
  });

  it('默认为 i.muicv.com 资源补充 width=1280,quality=75 缩放前缀', () => {
    const url = 'https://i.muicv.com/blog/ai-agent-gamebook-creation-guide/1-game-play.jpg';
    const optimized = buildOptimizedImageUrl(url);
    expect(optimized).toBe(
      'https://i.muicv.com/cdn-cgi/image/fit=scale-down,format=auto,width=1280,quality=75/https://i.muicv.com/blog/ai-agent-gamebook-creation-guide/1-game-play.jpg',
    );
  });
});
