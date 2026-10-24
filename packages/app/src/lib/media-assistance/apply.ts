import { stringify } from '@roudanio/parser';
import { createContentWrite } from './content-write';
import { getGeneration, loadAssistanceGame, reconcileTargets } from './store';
import { resolveTarget } from './targets';
import { AssistanceError, type MediaTarget } from './types';

export async function applyAsset(db: D1Database, gameId: number, assetId: string, inputHash: string) {
  const loaded = await loadAssistanceGame(db, gameId);
  const rows = await reconcileTargets(db, loaded);
  const target = rows.find((row) => row.id === assetId);
  if (!target) throw new AssistanceError('素材位置不存在', 404);
  if (target.input_hash !== inputHash) throw new AssistanceError('素材计划已更新，不能应用旧结果');
  if (target.status !== 'pending') return { assetId, status: target.status };
  const generation = await getGeneration(db, gameId, inputHash);
  if (generation.status !== 'ready' || !generation.output_url) throw new AssistanceError('素材尚未上传完成');
  const resolved = await resolveTarget(loaded.game, JSON.parse(target.target_json) as MediaTarget);
  if (!resolved || resolved.sourceHash !== target.source_hash || resolved.url) {
    throw new AssistanceError('目标已变化或已有素材，不能覆盖');
  }
  resolved.setUrl(generation.output_url);
  const content = stringify(loaded.game);
  const write = createContentWrite(db, gameId, loaded.revision, content, true);
  const revision = await write.run([
    db
      .prepare(`UPDATE MediaAssistanceTargets SET status = 'applied', applied_url = ?, error = NULL
      WHERE id = ? AND input_hash = ? AND status = 'pending' AND ${write.guard}`)
      .bind(generation.output_url, assetId, inputHash, ...write.guardParams),
    db
      .prepare(`UPDATE Games SET cover_image = ? WHERE id = ? AND ${write.guard}`)
      .bind(loaded.game.cover_image ?? null, gameId, ...write.guardParams),
    // 仅把本轮规划基线前移；此前已存在作者修改时仍保留 needsPlanning。
    db
      .prepare(`UPDATE MediaAssistanceWorks SET checked_revision = (SELECT revision FROM GameContent WHERE game_id = ?),
      updated_at = unixepoch() WHERE game_id = ? AND checked_revision = ? AND ${write.guard}`)
      .bind(gameId, gameId, loaded.revision, ...write.guardParams),
  ]);
  return {
    assetId,
    status: 'applied',
    url: generation.output_url,
    revision,
    slug: loaded.slug,
    tags: loaded.game.tags,
  };
}
