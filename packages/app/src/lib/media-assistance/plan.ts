import { parse, stringify } from '@roudanio/parser';
import { createContentWrite } from './content-write';
import { canonicalJson, hashGenerationInput, readGenerationInput } from './hash';
import { loadAssistanceGame, reconcileTargets } from './store';
import { normalizeTarget, prepareTarget, readTarget, targetKey } from './targets';
import { AssistanceError, type JsonValue } from './types';

export async function savePlan(
  db: D1Database,
  gameId: number,
  revision: number,
  items: unknown,
  planningComplete = true,
) {
  if (!Array.isArray(items) || items.length > 200) throw new AssistanceError('items 必须是数组，每批最多 200 项', 400);
  const loaded = await loadAssistanceGame(db, gameId);
  if (loaded.revision !== revision) throw new AssistanceError('剧本版本已变化，请重新领取');
  const existing = await reconcileTargets(db, loaded);
  const work = await db
    .prepare("SELECT game_id FROM MediaAssistanceWorks WHERE game_id = ? AND status = 'active'")
    .bind(gameId)
    .first();
  if (!work) throw new AssistanceError('请先领取作品');
  const planned: {
    id: string;
    key: string;
    json: string;
    sourceHash: string;
    inputHash: string;
    inputJson: string;
    status: string;
  }[] = [];
  const seen = new Set<string>();
  for (const value of items) {
    if (!value || typeof value !== 'object') throw new AssistanceError('素材项无效', 400);
    const item = value as Record<string, unknown>;
    const input = readGenerationInput(item.input);
    const target = normalizeTarget(loaded.game, readTarget(item.target));
    const prior = existing.find((row) => row.target_key === targetKey(target));
    if (prior?.status === 'dismissed') continue;
    const resolved = await prepareTarget(loaded.game, target, input);
    const key = targetKey(resolved.target);
    if (seen.has(key)) throw new AssistanceError('同一批计划中出现重复素材位置', 400);
    seen.add(key);
    // 未变的目标沿用已冻结的输入，不接受 Agent 每次改写 prompt 制造新请求。
    if (prior && (resolved.url || prior.source_hash === resolved.sourceHash)) continue;
    planned.push({
      id: prior?.id ?? crypto.randomUUID(),
      key,
      json: JSON.stringify(resolved.target),
      sourceHash: resolved.sourceHash,
      inputHash: await hashGenerationInput(input),
      inputJson: canonicalJson(input as unknown as JsonValue),
      status: resolved.url ? 'satisfied' : 'pending',
    });
  }
  const nextContent = stringify(loaded.game);
  if (!parse(nextContent).success) throw new AssistanceError('素材计划无法序列化', 400);
  const write = createContentWrite(db, gameId, revision, nextContent, true);
  const statements: D1PreparedStatement[] = [];
  for (const item of planned) {
    statements.push(
      db
        .prepare(`INSERT INTO MediaAssistanceGenerations(game_id,input_hash,input_json,updated_at)
      SELECT ?,?,?,unixepoch() WHERE ${write.guard} ON CONFLICT(game_id,input_hash) DO NOTHING`)
        .bind(gameId, item.inputHash, item.inputJson, ...write.guardParams),
    );
    statements.push(
      db
        .prepare(`INSERT INTO MediaAssistanceTargets(id,game_id,target_key,target_json,source_hash,input_hash,status)
      SELECT ?,?,?,?,?,?,? WHERE ${write.guard} ON CONFLICT(game_id,target_key) DO UPDATE SET
      target_json = excluded.target_json, source_hash = excluded.source_hash, input_hash = excluded.input_hash,
      status = excluded.status, error = NULL WHERE MediaAssistanceTargets.status <> 'dismissed'`)
        .bind(item.id, gameId, item.key, item.json, item.sourceHash, item.inputHash, item.status, ...write.guardParams),
    );
  }
  if (planningComplete)
    statements.push(
      db
        .prepare(`UPDATE MediaAssistanceWorks SET checked_revision = (SELECT revision FROM GameContent WHERE game_id = ?),
    updated_at = unixepoch() WHERE game_id = ? AND ${write.guard}`)
        .bind(gameId, gameId, ...write.guardParams),
    );
  const nextRevision = await write.run(statements);
  return { gameId, revision: nextRevision, changed: planned.length };
}
