import { getGeneration, loadAssistanceGame, publicGeneration, reconcileTargets } from './store';
import { AssistanceError, type GenerationRow } from './types';

export async function claimItem(db: D1Database, gameId: number, assetId: string, requestId: string) {
  if (!requestId || requestId.length > 200) throw new AssistanceError('需要持久化的 requestId，重试必须沿用', 400);
  const loaded = await loadAssistanceGame(db, gameId);
  const targets = await reconcileTargets(db, loaded);
  const target = targets.find((row) => row.id === assetId);
  if (!target) throw new AssistanceError('素材位置不存在', 404);
  if (target.status !== 'pending') return { assetId, status: target.status, error: target.error };
  const token = crypto.randomUUID();
  await db
    .prepare(`UPDATE MediaAssistanceGenerations SET status = 'generating', request_id = ?, execution_token = ?,
    lease_until = unixepoch() + 1800, updated_at = unixepoch() WHERE game_id = ? AND input_hash = ? AND status = 'pending'
    AND EXISTS (SELECT 1 FROM MediaAssistanceWorks WHERE game_id = ? AND status = 'active')
    AND EXISTS (SELECT 1 FROM Games WHERE id = ? AND media_assistance_enabled = 1 AND published = 1 AND shadow_banned = 0)`)
    .bind(requestId, token, gameId, target.input_hash, gameId, gameId)
    .run();
  // 过期仅进入待核实，绝不因超时把付费生成重新放回待执行队列。
  await db
    .prepare(`UPDATE MediaAssistanceGenerations SET status = 'uncertain', error = '执行时间已过期，请先核对外部任务和本地文件'
    WHERE game_id = ? AND input_hash = ? AND status = 'generating' AND lease_until < unixepoch()`)
    .bind(gameId, target.input_hash)
    .run();
  const generation = await getGeneration(db, gameId, target.input_hash);
  return { assetId, ...publicGeneration(generation, generation.request_id === requestId) };
}

export async function updateItem(db: D1Database, gameId: number, hash: string, args: Record<string, unknown>) {
  await loadAssistanceGame(db, gameId);
  const row = await getGeneration(db, gameId, hash);
  const action = args.action;
  if (!['checkpoint', 'pause', 'resume'].includes(String(action))) throw new AssistanceError('action 无效', 400);
  if (row.status === 'ready') return publicGeneration(row);
  if (action === 'resume') {
    if (!['paused', 'uncertain'].includes(row.status) || args.confirmedNoResult !== true) {
      throw new AssistanceError('恢复前必须确认外部任务未在运行且没有已有产物，传 confirmedNoResult: true');
    }
    await db
      .prepare(`UPDATE MediaAssistanceGenerations SET status = 'pending', request_id = NULL, execution_token = NULL,
      lease_until = NULL, provider_task_id = NULL, error = NULL, updated_at = unixepoch()
      WHERE game_id = ? AND input_hash = ? AND status IN ('paused','uncertain')`)
      .bind(gameId, hash)
      .run();
  } else {
    if (row.execution_token && args.executionToken !== row.execution_token)
      throw new AssistanceError('执行凭据不匹配', 403);
    if (
      action === 'checkpoint' &&
      (!row.execution_token || !['generating', 'uncertain', 'paused'].includes(row.status))
    ) {
      throw new AssistanceError('请先领取素材');
    }
    const reason = typeof args.reason === 'string' ? args.reason.trim() : '';
    if (action === 'pause' && !reason) throw new AssistanceError('暂停需要记录原因', 400);
    const providerTaskId = typeof args.providerTaskId === 'string' ? args.providerTaskId : row.provider_task_id;
    await db
      .prepare(`UPDATE MediaAssistanceGenerations SET status = ?, provider_task_id = ?, error = ?,
      lease_until = unixepoch() + 1800, updated_at = unixepoch() WHERE game_id = ? AND input_hash = ? AND status = ?`)
      .bind(action === 'pause' ? 'paused' : 'generating', providerTaskId, reason || null, gameId, hash, row.status)
      .run();
  }
  return publicGeneration(await getGeneration(db, gameId, hash));
}

export function requireExecutionToken(row: GenerationRow, token: string) {
  if (!token || row.execution_token !== token) throw new AssistanceError('执行凭据不匹配', 403);
  if (!['generating', 'uncertain', 'ready'].includes(row.status)) throw new AssistanceError('任务尚未领取或已暂停');
}
