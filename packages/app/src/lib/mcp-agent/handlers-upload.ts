/**
 * MCP Agent 工具：素材上传（uploadAsset）。
 * 支持 data URL（base64 或 URL 编码）与裸 base64 两种入参，写入 R2 并按用途拼 key。
 */
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { type McpGameContext, type McpToolOutcome, fail, ok } from './shared';

export async function handleUploadAsset(
  { gameId, game }: McpGameContext,
  args: Record<string, unknown>,
): Promise<McpToolOutcome> {
  const raw = String(args.data || '').trim();
  if (!raw) return fail('缺少 data');
  let bytes: Uint8Array;
  let contentType = typeof args.contentType === 'string' ? args.contentType : '';
  if (raw.startsWith('data:')) {
    const match = raw.match(/^data:([^;,]+)?(;base64)?,([\s\S]*)$/);
    if (!match) return fail('data URL 格式无效');
    if (match[1]) contentType = contentType || match[1];
    bytes = match[2]
      ? Uint8Array.from(atob(match[3]), (c) => c.charCodeAt(0))
      : new TextEncoder().encode(decodeURIComponent(match[3]));
  } else {
    if (!contentType) return fail('裸 base64 时必须提供 contentType');
    bytes = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
  }
  if (bytes.byteLength > 8 * 1024 * 1024) return fail('素材过大（上限 8MB）');

  const { env } = getCloudflareContext();
  const bucket = env.ASSETS_BUCKET;
  if (!bucket) return fail("R2 Bucket 'ASSETS_BUCKET' not found");

  const extFromName = typeof args.fileName === 'string' ? args.fileName.split('.').pop() || '' : '';
  const extFromMime = (contentType.split('/')[1] || '').replace(/\+.*/, '');
  const ext = (extFromName || extFromMime || 'bin').toLowerCase();
  const kind = typeof args.type === 'string' ? args.type : 'scene';
  const characterId = typeof args.characterId === 'string' ? args.characterId : '';
  const stamp = Date.now();
  let key: string;
  switch (kind) {
    case 'character':
      key = `images/${game.slug}/characters/${characterId || 'unknown'}-${stamp}.${ext}`;
      break;
    case 'cover':
      key = `images/${game.slug}/cover-${stamp}.${ext}`;
      break;
    case 'chat':
      key = `images/${game.slug}/chat-${stamp}.${ext}`;
      break;
    case 'audio':
      key = `audio/${game.slug}/${stamp}.${ext}`;
      break;
    case 'video':
      key = `video/${game.slug}/${stamp}.${ext}`;
      break;
    default:
      key = `images/${game.slug}/scenes/${stamp}.${ext}`;
      break;
  }
  await bucket.put(key, bytes, {
    httpMetadata: {
      contentType: contentType || 'application/octet-stream',
      cacheControl: 'public, max-age=31536000, immutable',
    },
  });
  const publicDomain = env.ASSETS_PUBLIC_DOMAIN || process.env.ASSETS_PUBLIC_DOMAIN;
  const url = publicDomain ? `${publicDomain}/${key}` : `R2://${key}`;
  return ok('素材已上传', { url, key, contentType, bytes: bytes.byteLength });
}
