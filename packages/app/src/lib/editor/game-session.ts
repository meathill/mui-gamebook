/**
 * 游戏编辑会话管理器（客户端内存级别）
 *
 * 核心逻辑：
 * 1. 新 game 无 id 时用内存级别的临时 id（ses_${crypto.randomUUID()}）；
 * 2. 只要用户不切换到其它游戏，都持续使用这个 id；
 * 3. 保存后有了 game id，也还继续用此临时 id；
 * 4. 打开/切换到其它已有 gameId 的游戏且未有临时映射时，用 gameId 生成兜底 id（game_${gameId}）；
 * 5. 提供 getGameSessionHeaders 便捷方法，为请求注入 x-opencode-session 与 x-session-id。
 */

interface GameSessionState {
  /** 当前活跃游戏的 session id */
  activeSessionId: string | null;
  /** 当前绑定的游戏唯一标识（新游戏为临时标识 'temp_...'，已保存游戏为 'game_${gameId}'） */
  activeGameKey: string | null;
  /** 维护各个游戏标识与其对应的 sessionId 映射 */
  sessionMap: Map<string, string>;
}

const state: GameSessionState = {
  activeSessionId: null,
  activeGameKey: null,
  sessionMap: new Map(),
};

function normalizeGameId(gameId?: string | number | null): string | null {
  if (gameId === undefined || gameId === null) return null;
  const str = String(gameId).trim();
  if (!str || str === 'new' || str === '0') return null;
  return str;
}

function generateTempSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `ses_${crypto.randomUUID()}`;
  }
  return `ses_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * 获取或创建当前游戏的 Session ID
 *
 * @param gameId 可选的游戏 ID。若为 undefined/null/'new'，视为新建游戏；否则为已有游戏
 */
export function getGameSessionId(gameId?: string | number | null): string {
  const normId = normalizeGameId(gameId);

  // 1. 新 game 无 id
  if (!normId) {
    // 如果当前已经是活跃的新游戏临时 session，则持续使用同一个临时 id
    if (state.activeSessionId && state.activeGameKey?.startsWith('temp_')) {
      return state.activeSessionId;
    }
    // 否则生成新临时 id
    const newTempId = generateTempSessionId();
    const tempKey = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    state.activeSessionId = newTempId;
    state.activeGameKey = tempKey;
    state.sessionMap.set(tempKey, newTempId);
    return newTempId;
  }

  // 2. 有 gameId
  const gameKey = `game_${normId}`;

  // 检查是否已有映射（例如：新游戏保存后已绑定到该 gameId，或之前已访问过）
  if (state.sessionMap.has(gameKey)) {
    const existing = state.sessionMap.get(gameKey)!;
    state.activeSessionId = existing;
    state.activeGameKey = gameKey;
    return existing;
  }

  // 如果当前刚好从无 id 状态（正在创作中的临时 session）直接携带了新分配的 gameId
  // 且当前临时 session 尚未绑定到任何 gameKey，自动绑定当前临时 session
  if (state.activeSessionId && state.activeGameKey?.startsWith('temp_')) {
    const currentSession = state.activeSessionId;
    state.sessionMap.set(gameKey, currentSession);
    state.activeGameKey = gameKey;
    return currentSession;
  }

  // 兜底：已有游戏初次载入且未绑定过临时 session，用 gameId 生成兜底 id
  const fallbackId = `game_${normId}`;
  state.activeSessionId = fallbackId;
  state.activeGameKey = gameKey;
  state.sessionMap.set(gameKey, fallbackId);
  return fallbackId;
}

/**
 * 当新游戏在云端保存成功、分配到正式 gameId 时调用
 * 将当前内存临时 id 绑定到该 gameId，确保“保存后有了 game id，也还继续用”
 */
export function bindGameIdToSession(gameId: string | number): void {
  const normId = normalizeGameId(gameId);
  if (!normId) return;

  const gameKey = `game_${normId}`;
  // 如果当前已有正在使用的 session，直接将该 session 绑定到 gameKey
  const currentSession = state.activeSessionId || generateTempSessionId();
  state.activeSessionId = currentSession;
  state.activeGameKey = gameKey;
  state.sessionMap.set(gameKey, currentSession);
}

/**
 * 切换游戏时显式调用
 *
 * @param newGameId 目标游戏 ID，不传或传空表示切换到一个新的空白游戏
 */
export function switchGame(newGameId?: string | number | null): string {
  const normId = normalizeGameId(newGameId);

  if (!normId) {
    // 切换到全新游戏：强制重置并生成新的临时 session
    const newTempId = generateTempSessionId();
    const tempKey = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    state.activeSessionId = newTempId;
    state.activeGameKey = tempKey;
    state.sessionMap.set(tempKey, newTempId);
    return newTempId;
  }

  const gameKey = `game_${normId}`;
  if (state.sessionMap.has(gameKey)) {
    const existing = state.sessionMap.get(gameKey)!;
    state.activeSessionId = existing;
    state.activeGameKey = gameKey;
    return existing;
  }

  // 用 gameId 生成兜底 id
  const fallbackId = `game_${normId}`;
  state.activeSessionId = fallbackId;
  state.activeGameKey = gameKey;
  state.sessionMap.set(gameKey, fallbackId);
  return fallbackId;
}

/**
 * 获取请求所需的 OpenCode session headers
 */
export function getGameSessionHeaders(gameId?: string | number | null): Record<string, string> {
  const sessionId = getGameSessionId(gameId);
  return {
    'x-opencode-session': sessionId,
    'x-session-id': sessionId,
  };
}

/**
 * 重置所有会话（主要用于单元测试或用户彻底登出）
 */
export function resetGameSession(): void {
  state.activeSessionId = null;
  state.activeGameKey = null;
  state.sessionMap.clear();
}
