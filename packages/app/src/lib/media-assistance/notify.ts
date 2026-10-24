import type { MediaTarget } from './types';

const KIND_LABELS: Record<string, string> = {
  cover: '封面',
  character: '角色形象',
  image: '场景图片',
  video: '场景视频',
  audio: '场景音频',
  speech: '配音',
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

function describeTarget(target: MediaTarget) {
  const label = KIND_LABELS[target.kind] ?? target.kind;
  const where = 'characterId' in target ? target.characterId : 'sceneId' in target ? target.sceneId : undefined;
  return where ? `${label}（${where}）` : label;
}

/**
 * 站方代为开启的作品完成一轮后通知作者一次。
 * 发送失败不影响完成状态，下次完成时会重试。
 */
export async function notifySystemEnrolledAuthor(
  db: D1Database,
  gameId: number,
  send: (message: { to: string; subject: string; body: string }) => Promise<void>,
  siteUrl: string,
): Promise<boolean> {
  const game = await db
    .prepare(`SELECT g.id, g.title, u.email FROM Games g JOIN user u ON u.id = g.owner_id
    WHERE g.id = ? AND g.media_assistance_enrolled_by = 'system' AND g.media_assistance_notified_at IS NULL`)
    .bind(gameId)
    .first<{ id: number; title: string; email: string | null }>();
  if (!game?.email) return false;
  const targets = (
    await db
      .prepare("SELECT target_json FROM MediaAssistanceTargets WHERE game_id = ? AND status = 'applied'")
      .bind(gameId)
      .all<{ target_json: string }>()
  ).results;
  if (!targets.length) return false;
  const items = targets.map(
    (row) => `<li>${escapeHtml(describeTarget(JSON.parse(row.target_json) as MediaTarget))}</li>`,
  );
  const editorUrl = `${siteUrl.replace(/\/$/, '')}/my/edit/${game.id}`;
  const title = escapeHtml(game.title);
  try {
    await send({
      to: game.email,
      subject: `我们为《${game.title}》补充了 ${targets.length} 项素材 - 姆伊游戏书`,
      body: `
<h2>你的作品《${title}》有了新素材</h2>
<p>你好！《${title}》很受读者欢迎，站方 AI 素材协助为它补充了以下素材（不消耗你的额度）：</p>
<ul>${items.join('')}</ul>
<p>你可以在编辑器中查看和调整：<a href="${editorUrl}">${editorUrl}</a></p>
<p>如果不喜欢某项素材，直接在编辑器里删除即可，站方不会再为该位置重新生成。</p>
<p>如果不希望站方继续协助，可以在游戏设置中取消勾选「接受站方 AI 素材协助」，关闭后我们不会再处理这部作品。</p>
<p>—— 姆伊游戏书</p>`.trim(),
    });
  } catch (error) {
    console.error('素材协助通知邮件发送失败', error);
    return false;
  }
  await db.prepare('UPDATE Games SET media_assistance_notified_at = unixepoch() WHERE id = ?').bind(gameId).run();
  return true;
}
