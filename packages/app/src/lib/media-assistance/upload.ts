import { requireExecutionToken } from './generation';
import { getGeneration, loadAssistanceGame, publicGeneration } from './store';
import { AssistanceError, type GenerationInput } from './types';

const MAX_BYTES = 64 * 1024 * 1024;
const EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/ogg': 'ogg',
  'audio/mp4': 'm4a',
  'audio/webm': 'webm',
};

export async function uploadAssistanceAsset(
  db: D1Database,
  bucket: R2Bucket,
  publicDomain: string,
  request: Request,
  gameId: number,
  inputHash: string,
) {
  await loadAssistanceGame(db, gameId);
  const row = await getGeneration(db, gameId, inputHash);
  requireExecutionToken(row, request.headers.get('X-Execution-Token') ?? '');
  const fileHash = request.headers.get('X-Content-SHA256') ?? '';
  if (!/^[a-f0-9]{64}$/.test(fileHash)) throw new AssistanceError('需要 X-Content-SHA256 文件校验值', 400);
  const contentType = request.headers.get('Content-Type')?.split(';')[0] ?? '';
  const extension = EXTENSIONS[contentType];
  const input = JSON.parse(row.input_json) as GenerationInput;
  const category = input.kind === 'image' ? 'image/' : input.kind === 'video' ? 'video/' : 'audio/';
  if (!extension || !contentType.startsWith(category)) throw new AssistanceError('文件类型与生成任务不匹配', 415);
  const length = Number(request.headers.get('Content-Length'));
  if (!Number.isInteger(length) || length <= 0 || length > MAX_BYTES || !request.body)
    throw new AssistanceError('文件必须在 1 字节至 64 MiB 之间，并提供 Content-Length', 413);
  if (row.output_url) {
    if (row.file_hash !== fileHash) throw new AssistanceError('已有上传结果，不能用不同文件覆盖');
    return publicGeneration(row);
  }
  if (!/^https?:\/\//.test(publicDomain)) throw new AssistanceError('未配置素材公网域名', 503);
  const key = `media-assistance/${gameId}/${inputHash}/${fileHash}.${extension}`;
  let object = await bucket.head(key);
  if (!object) {
    object = await bucket.put(key, request.body, {
      sha256: fileHash,
      onlyIf: { etagDoesNotMatch: '*' },
      httpMetadata: { contentType, cacheControl: 'public, max-age=31536000, immutable' },
    });
    object ??= await bucket.head(key);
  }
  if (!object || object.size !== length) throw new AssistanceError('文件长度校验失败', 400);
  const url = `${publicDomain.replace(/\/$/, '')}/${key}`;
  await db
    .prepare(`UPDATE MediaAssistanceGenerations SET status = 'ready', output_key = ?, output_url = ?, file_hash = ?,
    content_type = ?, error = NULL, updated_at = unixepoch() WHERE game_id = ? AND input_hash = ?
    AND execution_token = ? AND status IN ('generating','uncertain') AND output_url IS NULL
    AND EXISTS (SELECT 1 FROM Games WHERE id = ? AND media_assistance_enabled = 1 AND published = 1 AND shadow_banned = 0)`)
    .bind(key, url, fileHash, contentType, gameId, inputHash, row.execution_token, gameId)
    .run();
  const result = await getGeneration(db, gameId, inputHash);
  if (result.output_key !== key) throw new AssistanceError('任务状态已变化，文件未应用；请核对已有记录');
  return publicGeneration(result);
}
