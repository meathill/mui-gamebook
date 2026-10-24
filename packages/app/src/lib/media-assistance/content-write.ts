import { AssistanceError } from './types';

// write_token 把同一批中的后续写入绑定到成功的 CAS，CAS 失败时整批均不产生业务变更。
export function createContentWrite(
  db: D1Database,
  gameId: number,
  revision: number,
  content: string,
  requireConsent = false,
  advanceRevision = false,
) {
  const token = crypto.randomUUID();
  const guard = 'EXISTS (SELECT 1 FROM GameContent WHERE game_id = ? AND write_token = ?)';
  const guardParams = [gameId, token];
  const eligibility = requireConsent
    ? ' AND EXISTS (SELECT 1 FROM Games WHERE id = game_id AND media_assistance_enabled = 1 AND published = 1 AND shadow_banned = 0)'
    : '';
  const first = db
    .prepare(
      `UPDATE GameContent SET content = ?, write_token = ?, revision = revision + ${advanceRevision ? 1 : 0} WHERE game_id = ? AND revision = ?${eligibility} RETURNING id`,
    )
    .bind(content, token, gameId, revision);
  return {
    guard,
    guardParams,
    async run(statements: D1PreparedStatement[]) {
      const result = await db.batch([
        first,
        ...statements,
        db.prepare('SELECT revision FROM GameContent WHERE game_id = ? AND write_token = ?').bind(gameId, token),
      ]);
      if (result[0].results.length !== 1) throw new AssistanceError('作品已更新或已停止协助，请重新读取后重试');
      const row = result[result.length - 1].results[0] as { revision: number };
      return row.revision;
    },
  };
}
