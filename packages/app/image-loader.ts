import type { ImageLoaderProps } from 'next/image';

const TRANSFORM_PREFIX = '/cdn-cgi/image';

/** 已知会在 Cloudflare Image Resizing 回源时 403 的外域，生产环境直接回退本地占位 */
const BLOCKED_HOSTS = ['picsum.photos'];

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

  const normalizedSource = trimmed.startsWith('/') && !trimmed.startsWith('//') ? trimmed.slice(1) : trimmed;
  const options = [`fit=scale-down`, `format=auto`, `width=${normalizeWidth(width)}`];
  const normalizedQuality = normalizeQuality(quality);

  if (normalizedQuality !== undefined) {
    options.push(`quality=${normalizedQuality}`);
  }

  return `${TRANSFORM_PREFIX}/${options.join(',')}/${normalizedSource}`;
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
