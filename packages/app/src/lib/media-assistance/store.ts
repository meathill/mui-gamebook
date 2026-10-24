import { parse, type Game } from '@roudanio/parser';
import { createContentWrite } from './content-write';
import { resolveTarget } from './targets';
import { AssistanceError, type GenerationRow, type MediaTarget, type TargetRow } from './types';

export interface AssistanceGame {
  id: number;
  slug: string;
  title: string;
  content: string;
  revision: number;
  game: Game;
}

export async function loadAssistanceGame(db: D1Database, gameId: number): Promise<AssistanceGame> {
  const row = await db
    .prepare(`SELECT g.id, g.slug, g.title, g.cover_image AS stored_cover_image, c.content, c.revision FROM Games g
    JOIN GameContent c ON c.game_id = g.id WHERE g.id = ? AND g.media_assistance_enabled = 1
    AND g.published = 1 AND g.shadow_banned = 0`)
    .bind(gameId)
    .first<Omit<AssistanceGame, 'game'> & { stored_cover_image: string | null }>();
  if (!row) throw new AssistanceError('作品不存在、未发布或已停止协助');
  const parsed = parse(row.content);
  if (!parsed.success) throw new AssistanceError(`剧本无效：${parsed.error}`, 422);
  if (row.stored_cover_image) parsed.data.cover_image = row.stored_cover_image;
  return { ...row, game: parsed.data };
}

export async function listTargets(db: D1Database, gameId: number): Promise<TargetRow[]> {
  return (
    await db.prepare('SELECT * FROM MediaAssistanceTargets WHERE game_id = ? ORDER BY id').bind(gameId).all<TargetRow>()
  ).results;
}

export async function getGeneration(db: D1Database, gameId: number, hash: string): Promise<GenerationRow> {
  const row = await db
    .prepare('SELECT * FROM MediaAssistanceGenerations WHERE game_id = ? AND input_hash = ?')
    .bind(gameId, hash)
    .first<GenerationRow>();
  if (!row) throw new AssistanceError('生成任务不存在', 404);
  return row;
}

export async function reconcileTargets(db: D1Database, loaded: AssistanceGame): Promise<TargetRow[]> {
  const rows = await listTargets(db, loaded.id);
  const write = createContentWrite(db, loaded.id, loaded.revision, loaded.content, true);
  const statements: D1PreparedStatement[] = [];
  for (const row of rows) {
    if (row.status === 'dismissed') continue;
    let status: TargetRow['status'] = row.status;
    let error = row.error;
    try {
      const resolved = await resolveTarget(loaded.game, JSON.parse(row.target_json) as MediaTarget);
      if (!resolved || (row.applied_url && (row.status === 'applied' || row.status === 'satisfied') && !resolved.url)) {
        status = 'dismissed';
        error = '作者已删除素材或位置';
      } else if (resolved.url) {
        status = resolved.url === row.applied_url ? 'applied' : 'satisfied';
        error = null;
      } else if (resolved.sourceHash !== row.source_hash) {
        status = 'paused';
        error = '素材声明已变化，需要增量更新计划';
      } else if (row.status === 'satisfied') {
        status = 'pending';
        error = null;
      }
    } catch (cause) {
      if (!(cause instanceof AssistanceError)) throw cause;
      status = 'paused';
      error = cause.message;
    }
    if (status !== row.status || error !== row.error) {
      statements.push(
        db
          .prepare(`UPDATE MediaAssistanceTargets SET status = ?, error = ? WHERE id = ? AND ${write.guard}`)
          .bind(status, error, row.id, ...write.guardParams),
      );
      row.status = status;
      row.error = error;
    }
  }
  if (statements.length) await write.run(statements);
  return rows;
}

export async function workCounts(db: D1Database, gameId: number) {
  const row = await db
    .prepare(`SELECT
    COALESCE(SUM(CASE WHEN t.status = 'pending' AND g.status <> 'paused' THEN 1 ELSE 0 END), 0) AS pending,
    COALESCE(SUM(CASE WHEN t.status = 'paused' OR (t.status = 'pending' AND g.status = 'paused') THEN 1 ELSE 0 END), 0) AS paused,
    COUNT(*) AS total FROM MediaAssistanceTargets t JOIN MediaAssistanceGenerations g
    ON t.game_id = g.game_id AND t.input_hash = g.input_hash WHERE t.game_id = ?`)
    .bind(gameId)
    .first<{ pending: number; paused: number; total: number }>();
  return row ?? { pending: 0, paused: 0, total: 0 };
}

export function publicGeneration(row: GenerationRow, includeToken = false) {
  const { execution_token, ...result } = row;
  return { ...result, ...(includeToken ? { executionToken: execution_token } : {}) };
}
