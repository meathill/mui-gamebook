import type { ImageLoaderProps } from 'next/image';

const TRANSFORM_PREFIX = '/cdn-cgi/image';

/** 已知会在 Cloudflare Image Resizing 回源时 403 的外域，生产环境直接回退本地占位 */
const BLOCKED_HOSTS = ['picsum.photos'];

/** 支持使用自身 Cloudflare Image Resizing 服务的 CDN 域名（就近在自身边缘缩放） */
export const SELF_RESIZING_HOSTS = ['i.muicv.com'];

/** 本地占位图，替代失效外链 */
export const PLACEHOLDER_COVER = '/images/placeholder-cover-400x600.png';

function isDevelopmentRuntime() {
  return process.env.NODE_ENV !== 'production';
}

/** Cloudflare 缩放宽度上限：全屏背景 1920 足够，4K 屏也够用（Ahrefs width=3840 超大图治理） */
export const MAX_IMAGE_WIDTH = 1920;

/** 默认压缩质量：AI 插画在 75 下视觉无感、体积降 30–50% */
export const DEFAULT_IMAGE_QUALITY = 75;

function normalizeWidth(width: number) {
  if (!Number.isFinite(width) || width <= 0) return 1200;
  return Math.min(MAX_IMAGE_WIDTH, Math.round(width));
}

function normalizeQuality(quality: number | undefined) {
  if (quality === undefined) {
    return DEFAULT_IMAGE_QUALITY;
  }

  const nextQuality = Math.round(quality);
  if (!Number.isFinite(nextQuality)) {
    return DEFAULT_IMAGE_QUALITY;
  }

  return Math.min(100, Math.max(1, nextQuality));
}

function isBlockedHost(src: string): boolean {
  return BLOCKED_HOSTS.some((host) => src.includes(host));
}

export function isPlaceholderNeeded(src: string): boolean {
  if (!src) return true;
  const trimmed = src.trim();
  if (!trimmed) return true;
  return isBlockedHost(trimmed);
}

export function resolveCoverSrc(src: string | null | undefined): string {
  if (!src) return PLACEHOLDER_COVER;
  const trimmed = src.trim();
  if (!trimmed || isBlockedHost(trimmed)) return PLACEHOLDER_COVER;
  return trimmed;
}

/**
 * 判断图片是否属于当前 Cloudflare Zone（muistory.com 及其子域）或本地路径。
 * Cloudflare Image Resizing (/cdn-cgi/image/...) 默认仅能缩放同 Zone 资源；
 * 未在 Cloudflare 后台授权的外域通过本站 cdn-cgi 代理会直接报 403 Forbidden。
 */
export function isSameZoneHost(src: string): boolean {
  if (src.startsWith('/') && !src.startsWith('//')) {
    return true;
  }
  try {
    const urlString = src.startsWith('//') ? `https:${src}` : src;
    const { hostname } = new URL(urlString);
    return hostname === 'muistory.com' || hostname.endsWith('.muistory.com') || hostname === 'localhost';
  } catch {
    return false;
  }
}

export function buildCloudflareImageUrl({ src, width, quality }: ImageLoaderProps) {
  const trimmed = src.trim();

  // 失效外链直接回退本地占位，避免 cdn-cgi 回源 403 裂图
  if (isBlockedHost(trimmed)) {
    return PLACEHOLDER_COVER;
  }

  // 如果是本地 Blob 或 base64 data URI，跳过 Cloudflare resizing
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return src;
  }

  // 避免已带 /cdn-cgi/image/ 的 URL 被二次重复嵌套
  if (trimmed.includes(TRANSFORM_PREFIX)) {
    return src;
  }

  const options = [`fit=scale-down`, `format=auto`, `width=${normalizeWidth(width)}`];
  const normalizedQuality = normalizeQuality(quality);

  if (normalizedQuality !== undefined) {
    options.push(`quality=${normalizedQuality}`);
  }

  const optionStr = options.join(',');

  // 1. 同 Zone 资源（本地相对路径、muistory.com 及其子域）：走当前站的 /cdn-cgi/image/
  if (isSameZoneHost(trimmed)) {
    const normalizedSource = trimmed.startsWith('/') && !trimmed.startsWith('//') ? trimmed.slice(1) : trimmed;
    return `${TRANSFORM_PREFIX}/${optionStr}/${normalizedSource}`;
  }

  // 2. 自带 Cloudflare Image Resizing 的外部 CDN（如 i.muicv.com）：由其自身域名节点就近缩放
  try {
    const urlString = trimmed.startsWith('//') ? `https:${trimmed}` : trimmed;
    const url = new URL(urlString);
    if (SELF_RESIZING_HOSTS.includes(url.hostname)) {
      return `${url.origin}${TRANSFORM_PREFIX}/${optionStr}/${url.href}`;
    }
  } catch {
    // 忽略解析错误，降级返回原图
  }

  // 3. 未知或不支持的外域：直接返回原图 URL，避免 403 裂图
  return src;
}

/**
 * 针对普通 <img> 或 Markdown 配图的 URL 优化辅助函数：
 * 支持同 Zone 资源及 i.muicv.com 等自有 CDN 自动缩放与压缩，
 * 默认宽度 1280、质量 75。
 */
export function buildOptimizedImageUrl(
  src: string | null | undefined,
  options?: { width?: number; quality?: number },
): string {
  if (!src) return '';
  const trimmed = src.trim();
  if (!trimmed) return '';
  return buildCloudflareImageUrl({
    src: trimmed,
    width: options?.width ?? 1280,
    quality: options?.quality ?? DEFAULT_IMAGE_QUALITY,
  });
}

export default function cloudflareImageLoader(props: ImageLoaderProps) {
  if (isBlockedHost(props.src.trim())) {
    return PLACEHOLDER_COVER;
  }

  if (isDevelopmentRuntime()) {
    return props.src;
  }

  return buildCloudflareImageUrl(props);
}
