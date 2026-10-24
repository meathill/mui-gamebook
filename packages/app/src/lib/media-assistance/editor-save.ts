import type { Game } from '@roudanio/parser';
import { createContentWrite } from './content-write';
import { hasDeclaredMedia } from './targets';
import { AssistanceError } from './types';

export interface AssistanceSettings {
  mediaAssistanceEnabled?: boolean;
  mediaPlanningConfirmed?: boolean;
}

export async function saveEditorContent(
  db: D1Database,
  options: {
    gameId: number;
    content: string;
    game: Game;
    expectedRevision: number;
    slug: string;
    actorId: string;
    storyPrompt?: string;
  } & AssistanceSettings,
) {
  const current = await db
    .prepare('SELECT owner_id, media_assistance_enabled, media_planning_confirmed FROM Games WHERE id = ?')
    .bind(options.gameId)
    .first<{ owner_id: string; media_assistance_enabled: number; media_planning_confirmed: number }>();
  if (!current) throw new AssistanceError('作品不存在', 404);
  if (!Number.isInteger(options.expectedRevision) || options.expectedRevision < 0)
    throw new AssistanceError('请重新加载作品后保存，缺少有效版本号');
  const enabled = options.mediaAssistanceEnabled ?? Boolean(current.media_assistance_enabled);
  const enabling = enabled && !current.media_assistance_enabled;
  if (enabling && current.owner_id !== options.actorId) throw new AssistanceError('只有作者可以开启素材协助', 403);
  if (enabling && !hasDeclaredMedia(options.game) && options.mediaPlanningConfirmed !== true) {
    throw new AssistanceError('请先确认允许站方规划素材位置和提示词', 400);
  }
  const disabling = !enabled && Boolean(current.media_assistance_enabled);
  const write = createContentWrite(db, options.gameId, options.expectedRevision, options.content, false, true);
  const game = options.game;
  const statements = [
    db
      .prepare(`UPDATE Games SET slug = ?, title = ?, description = ?, background_story = ?,
    cover_image = ?, tags = ?, published = ?, updated_at = unixepoch(), media_assistance_enabled = ?,
    media_planning_confirmed = ?,
    media_assistance_enrolled_by = CASE WHEN ? THEN 'author' ELSE media_assistance_enrolled_by END,
    media_assistance_enrolled_at = CASE WHEN ? THEN unixepoch() ELSE media_assistance_enrolled_at END,
    media_assistance_opted_out_at = CASE WHEN ? THEN NULL WHEN ? THEN unixepoch() ELSE media_assistance_opted_out_at END,
    story_prompt = CASE WHEN ? THEN ? ELSE story_prompt END WHERE id = ? AND ${write.guard}`)
      .bind(
        options.slug,
        game.title,
        game.description ?? null,
        game.backgroundStory ?? null,
        game.cover_image ?? null,
        JSON.stringify(game.tags ?? []),
        game.published ? 1 : 0,
        enabled ? 1 : 0,
        enabling ? 1 : current.media_planning_confirmed,
        enabling ? 1 : 0,
        enabling ? 1 : 0,
        enabling ? 1 : 0,
        disabling ? 1 : 0,
        options.storyPrompt !== undefined ? 1 : 0,
        options.storyPrompt ?? null,
        options.gameId,
        ...write.guardParams,
      ),
  ];
  if (!enabled)
    statements.push(
      db
        .prepare(
          `UPDATE MediaAssistanceWorks SET status = 'pending' WHERE game_id = ? AND status = 'active' AND ${write.guard}`,
        )
        .bind(options.gameId, ...write.guardParams),
    );
  return write.run(statements);
}
