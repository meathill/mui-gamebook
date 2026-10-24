import { parse, stringify } from '@roudanio/parser';
import { createContentWrite } from './content-write';
import { resolveTarget } from './targets';
import { AssistanceError, type MediaTarget } from './types';

/** 撤回链接有效期：60 天 */
export const REVERT_LINK_TTL_SECONDS = 60 * 24 * 3600;

const encoder = new TextEncoder();

async function hmac(secret: string, message: string) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ]);
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(message)));
  return btoa(String.fromCharCode(...signature))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** 生成 `gameId.expires.signature` 形式的撤回令牌。 */
export async function createRevertToken(secret: string, gameId: number, now = Math.floor(Date.now() / 1000)) {
  const expires = now + REVERT_LINK_TTL_SECONDS;
  return `${gameId}.${expires}.${await hmac(secret, `media-assistance-revert:${gameId}:${expires}`)}`;
}

/** 校验令牌，成功返回 gameId。 */
export async function verifyRevertToken(secret: string, token: string, now = Math.floor(Date.now() / 1000)) {
  if (!secret) throw new AssistanceError('撤回功能未配置，请联系站方', 503);
  const [rawId, rawExpires, signature] = token.split('.');
  const gameId = Number(rawId);
  const expires = Number(rawExpires);
  if (!Number.isInteger(gameId) || gameId <= 0 || !Number.isInteger(expires) || !signature)
    throw new AssistanceError('撤回链接无效', 400);
  const expected = await hmac(secret, `media-assistance-revert:${gameId}:${expires}`);
  if (!safeEqual(expected, signature)) throw new AssistanceError('撤回链接无效', 400);
  if (expires < now) throw new AssistanceError('撤回链接已过期，请登录后在编辑器中删除素材或关闭协助', 410);
  return gameId;
}

/**
 * 撤回站方为作品添加的全部 AI 素材，并永久关闭站方协助。幂等。
 * - 只清除当前值仍等于 applied_url 的位置；作者已改动或自己的素材不动。
 * - 正文写入带 revision 保护，并发修改时报错，调用方可重试。
 */
export async function revertAssistance(db: D1Database, gameId: number, bucket?: R2Bucket) {
  const row = await db
    .prepare(`SELECT g.title, g.cover_image, c.content, c.revision FROM Games g JOIN GameContent c ON c.game_id = g.id
    WHERE g.id = ?`)
    .bind(gameId)
    .first<{ title: string; cover_image: string | null; content: string; revision: number }>();
  if (!row) throw new AssistanceError('作品不存在', 404);
  // 先关闭协助并暂停任务：applyAsset/upload 要求 enabled=1，之后不会再有新素材写入。
  await db.batch([
    db
      .prepare(`UPDATE Games SET media_assistance_enabled = 0,
      media_assistance_opted_out_at = COALESCE(media_assistance_opted_out_at, unixepoch()) WHERE id = ?`)
      .bind(gameId),
    db
      .prepare(`UPDATE MediaAssistanceGenerations SET status = 'paused', error = '作者已撤回', execution_token = NULL,
      lease_until = NULL WHERE game_id = ? AND status IN ('pending','generating','uncertain')`)
      .bind(gameId),
    db
      .prepare(
        "UPDATE MediaAssistanceWorks SET status = 'partial', updated_at = unixepoch() WHERE game_id = ? AND status IN ('active','pending')",
      )
      .bind(gameId),
  ]);
  const targets = (
    await db
      .prepare(
        "SELECT id, target_json, applied_url, input_hash FROM MediaAssistanceTargets WHERE game_id = ? AND status = 'applied'",
      )
      .bind(gameId)
      .all<{ id: string; target_json: string; applied_url: string | null; input_hash: string }>()
  ).results;

  const reverted: string[] = [];
  const parsed = parse(row.content);
  let coverCleared = false;
  if (parsed.success) {
    const game = parsed.data;
    if (row.cover_image) game.cover_image = row.cover_image;
    for (const target of targets) {
      const resolved = await resolveTarget(game, JSON.parse(target.target_json) as MediaTarget).catch(() => null);
      if (!resolved || !target.applied_url || resolved.url !== target.applied_url) continue;
      (resolved.setUrl as (url: string | undefined) => void)(undefined);
      if (resolved.target.kind === 'cover') coverCleared = true;
      reverted.push(target.id);
    }
    if (reverted.length) {
      const write = createContentWrite(db, gameId, row.revision, stringify(game), false, true);
      await write.run([
        ...(coverCleared
          ? [
              db
                .prepare(`UPDATE Games SET cover_image = NULL WHERE id = ? AND ${write.guard}`)
                .bind(gameId, ...write.guardParams),
            ]
          : []),
      ]);
    }
  }

  // 所有站方素材位置都标记为 dismissed（包括作者已改动的），以后不再补回。
  await db
    .prepare(`UPDATE MediaAssistanceTargets SET status = 'dismissed', error = '作者已撤回站方素材'
    WHERE game_id = ? AND status <> 'dismissed'`)
    .bind(gameId)
    .run();

  // 删除已撤回且不再被引用的文件；失败不影响撤回结果。
  let deletedFiles = 0;
  if (bucket && reverted.length) {
    const keys = (
      await db
        .prepare(`SELECT DISTINCT r.output_key FROM MediaAssistanceGenerations r JOIN MediaAssistanceTargets t
        ON t.game_id = r.game_id AND t.input_hash = r.input_hash
        WHERE r.game_id = ? AND r.output_key IS NOT NULL AND t.id IN (SELECT value FROM json_each(?))`)
        .bind(gameId, JSON.stringify(reverted))
        .all<{ output_key: string }>()
    ).results.map((item) => item.output_key);
    if (keys.length) {
      try {
        await bucket.delete(keys);
        deletedFiles = keys.length;
      } catch (error) {
        console.error('撤回素材文件删除失败', error);
      }
    }
  }
  return { gameId, title: row.title, reverted: reverted.length, deletedFiles };
}
