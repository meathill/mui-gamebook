import { beforeEach, describe, expect, it } from 'vitest';
import {
  bindGameIdToSession,
  getGameSessionHeaders,
  getGameSessionId,
  resetGameSession,
  switchGame,
} from '@/lib/editor/game-session';

describe('game-session 模块', () => {
  beforeEach(() => {
    resetGameSession();
  });

  it('新 game 无 id 时生成内存级别的临时 id，多次调用保持一致', () => {
    const s1 = getGameSessionId();
    expect(s1).toMatch(/^ses_/);

    const s2 = getGameSessionId();
    expect(s2).toBe(s1);

    const s3 = getGameSessionId('new');
    expect(s3).toBe(s1);
  });

  it('新 game 保存后有了 game id，继续沿用之前的临时 id', () => {
    // 1. 无 id 阶段使用临时 id
    const tempSessionId = getGameSessionId();
    expect(tempSessionId).toMatch(/^ses_/);

    // 2. 保存成功获得持久化 gameId 42
    bindGameIdToSession(42);

    // 3. 保存后通过 gameId 42 获取，仍是先前的临时 id
    const afterSavedSessionId = getGameSessionId(42);
    expect(afterSavedSessionId).toBe(tempSessionId);

    const afterSavedSessionIdStr = getGameSessionId('42');
    expect(afterSavedSessionIdStr).toBe(tempSessionId);
  });

  it('打开其它已有 gameId 的游戏且未有临时映射时，用 gameId 生成兜底 id', () => {
    const session = getGameSessionId(108);
    expect(session).toBe('game_108');

    const headers = getGameSessionHeaders(108);
    expect(headers['x-opencode-session']).toBe('game_108');
    expect(headers['x-session-id']).toBe('game_108');
  });

  it('切换到其它游戏时切换 session，不影响原有游戏的 session', () => {
    // 游戏 A (42)
    const sessionA = getGameSessionId(42);
    expect(sessionA).toBe('game_42');

    // 切换到游戏 B (99)
    const sessionB = switchGame(99);
    expect(sessionB).toBe('game_99');

    // 再切回游戏 A，依旧是 game_42
    const sessionAReturn = getGameSessionId(42);
    expect(sessionAReturn).toBe('game_42');
  });

  it('新建游戏 A 产生临时 id，切换到新建游戏 B 产生新的临时 id', () => {
    const sessionA = getGameSessionId();
    expect(sessionA).toMatch(/^ses_/);

    // 切换到另一个新建游戏
    const sessionB = switchGame();
    expect(sessionB).toMatch(/^ses_/);
    expect(sessionB).not.toBe(sessionA);
  });

  it('getGameSessionHeaders 返回正确的 header 对象', () => {
    const headers = getGameSessionHeaders(55);
    expect(headers).toEqual({
      'x-opencode-session': 'game_55',
      'x-session-id': 'game_55',
    });
  });
});
