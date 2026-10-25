import { notifySystemEnrolledAuthor } from './notify';
import { speechTargets } from './targets';
import { loadAssistanceGame, publicGeneration, reconcileTargets, workCounts } from './store';
import { AssistanceError, type GenerationRow, type WorkRow } from './types';

export type ClaimOptions = {
  /** 仅管理员：限定只领取该作品（仍执行全部资格检查）。 */
  gameId?: number;
  /** 自动收尾（续作已无待处理项）时，同 finish 一样通知代开作者。 */
  notify?: FinishNotify;
};

export async function claimWork(db: D1Database, options: ClaimOptions = {}): Promise<Record<string, unknown>> {
  const { gameId, notify } = options;
  const active = await db.prepare("SELECT * FROM MediaAssistanceWorks WHERE status = 'active'").first<WorkRow>();
  if (active) {
    let loaded;
    try {
      loaded = await loadAssistanceGame(db, active.game_id);
    } catch (error) {
      if (!(error instanceof AssistanceError)) throw error;
      await db
        .prepare("UPDATE MediaAssistanceWorks SET status = 'pending' WHERE game_id = ? AND status = 'active'")
        .bind(active.game_id)
        .run();
    }
    if (loaded) {
      const targets = await reconcileTargets(db, loaded);
      const counts = await workCounts(db, loaded.id);
      const needsPlanning = active.checked_revision !== loaded.revision;
      if (needsPlanning || counts.pending) {
        if (gameId && gameId !== loaded.id) {
          throw new AssistanceError(`作品 ${loaded.id} 仍在处理中，请先完成或暂停后再领取其他作品`, 409);
        }
        const generations = (
          await db
            .prepare('SELECT * FROM MediaAssistanceGenerations WHERE game_id = ?')
            .bind(loaded.id)
            .all<GenerationRow>()
        ).results;
        return {
          gameId: loaded.id,
          slug: loaded.slug,
          title: loaded.title,
          content: loaded.content,
          revision: loaded.revision,
          needsPlanning,
          targets,
          generations: generations.map((row) => publicGeneration(row)),
          speechTargets: await speechTargets(loaded.game),
          counts,
        };
      }
      await db
        .prepare('UPDATE MediaAssistanceWorks SET status = ? WHERE game_id = ? AND status = ?')
        .bind(counts.paused ? 'partial' : 'completed', loaded.id, 'active')
        .run();
      if (notify) await notifySystemEnrolledAuthor(db, loaded.id, notify.send, notify.siteUrl, notify.revertSecret, notify.replyTo);
    }
  }

  // 分页跳过无效剧本，避免单个坏数据或前 50 条占满队列。
  const skipped: { gameId: number; reason: string }[] = [];
  for (let offset = 0; ; offset += 50) {
    const candidates = (
      await db
        .prepare(`SELECT g.id, g.media_assistance_enabled FROM Games g JOIN GameContent c ON c.game_id = g.id
      LEFT JOIN MediaAssistanceWorks w ON w.game_id = g.id
      WHERE (g.media_assistance_enabled = 1 OR g.media_assistance_opted_out_at IS NULL)
      AND g.published = 1 AND g.shadow_banned = 0 AND (w.game_id IS NULL OR w.checked_revision <> c.revision OR EXISTS (
        SELECT 1 FROM MediaAssistanceTargets t JOIN MediaAssistanceGenerations r ON r.game_id = t.game_id AND r.input_hash = t.input_hash
        WHERE t.game_id = g.id AND t.status = 'pending' AND r.status <> 'paused'))
      AND (?1 IS NULL OR g.id = ?1)
      ORDER BY (g.media_assistance_enabled = 1 AND COALESCE(g.media_assistance_enrolled_by, '') <> 'system') DESC,
        (COALESCE(g.cover_image, '') = '' AND c.content NOT LIKE '%url: http%') DESC, (SELECT COALESCE(SUM(open_count),0) FROM GameAnalytics WHERE game_id = g.id) DESC,
        g.updated_at DESC, g.id DESC LIMIT 50 OFFSET ?2`)
        .bind(gameId ?? null, offset)
        .all<{ id: number; media_assistance_enabled: number }>()
    ).results;
    for (const candidate of candidates) {
      const enrolled = !candidate.media_assistance_enabled && (await enrollBySystem(db, candidate.id));
      try {
        await loadAssistanceGame(db, candidate.id);
      } catch (error) {
        if (!(error instanceof AssistanceError)) throw error;
        if (enrolled) await revertSystemEnroll(db, candidate.id);
        skipped.push({ gameId: candidate.id, reason: error.message });
        continue;
      }
      if (enrolled) await bumpRevision(db, candidate.id);
      await db
        .prepare(`INSERT OR IGNORE INTO MediaAssistanceWorks(game_id, updated_at) VALUES (?, unixepoch())`)
        .bind(candidate.id)
        .run();
      await db
        .prepare(`UPDATE MediaAssistanceWorks SET status = 'active', updated_at = unixepoch() WHERE game_id = ?
        AND NOT EXISTS (SELECT 1 FROM MediaAssistanceWorks WHERE status = 'active')`)
        .bind(candidate.id)
        .run();
      return { ...(await claimWork(db, options)), skipped };
    }
    if (candidates.length < 50)
      return { gameId: null, message: gameId ? `作品 ${gameId} 当前不可领取` : '暂无可处理作品', skipped };
  }
}

/**
 * 作者未主动开启（且未主动关闭）时，由站方代为开启。
 * 成功后推进正文 revision（见 bumpRevision），让作者手里旧的编辑器快照保存时冲突，避免误把开关关回去。
 */
async function enrollBySystem(db: D1Database, gameId: number): Promise<boolean> {
  const result = await db
    .prepare(`UPDATE Games SET media_assistance_enabled = 1, media_planning_confirmed = 1,
    media_assistance_enrolled_by = 'system', media_assistance_enrolled_at = unixepoch()
    WHERE id = ? AND media_assistance_enabled = 0 AND media_assistance_opted_out_at IS NULL`)
    .bind(gameId)
    .run();
  return Boolean(result.meta.changes);
}

/** 剧本校验通过后再推进 revision，避免无效剧本被反复代开时打扰作者编辑。 */
async function bumpRevision(db: D1Database, gameId: number) {
  await db.prepare('UPDATE GameContent SET revision = revision + 1 WHERE game_id = ?').bind(gameId).run();
}

async function revertSystemEnroll(db: D1Database, gameId: number) {
  await db
    .prepare(`UPDATE Games SET media_assistance_enabled = 0, media_planning_confirmed = 0,
    media_assistance_enrolled_by = NULL, media_assistance_enrolled_at = NULL
    WHERE id = ? AND media_assistance_enrolled_by = 'system'`)
    .bind(gameId)
    .run();
}

export type NotifySender = (message: { to: string; subject: string; body: string; replyTo?: string }) => Promise<void>;

export type FinishNotify = { send: NotifySender; siteUrl: string; revertSecret?: string; replyTo?: string };

export async function finishWork(db: D1Database, gameId: number, notify?: FinishNotify) {
  const loaded = await loadAssistanceGame(db, gameId);
  await reconcileTargets(db, loaded);
  const work = await db.prepare('SELECT * FROM MediaAssistanceWorks WHERE game_id = ?').bind(gameId).first<WorkRow>();
  if (!work || work.checked_revision !== loaded.revision) throw new AssistanceError('作品尚未完成当前版本的规划');
  const counts = await workCounts(db, gameId);
  if (counts.pending) throw new AssistanceError('仍有未处理素材，不能标记完成');
  const status = counts.paused ? 'partial' : 'completed';
  await db
    .prepare('UPDATE MediaAssistanceWorks SET status = ?, updated_at = unixepoch() WHERE game_id = ?')
    .bind(status, gameId)
    .run();
  const notified = notify
    ? await notifySystemEnrolledAuthor(db, gameId, notify.send, notify.siteUrl, notify.revertSecret, notify.replyTo)
    : false;
  return { gameId, status, counts, notified };
}
