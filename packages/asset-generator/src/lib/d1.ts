/**
 * D1 数据库操作模块
 */
import { CF_ACCOUNT_ID, CF_API_TOKEN, D1_DATABASE_ID } from './config';

// --- 类型定义 ---

interface D1QueryResult<T = unknown> {
  success: boolean;
  result: Array<{ results: T[] }>;
  errors?: Array<{ message: string }>;
}

export interface GameRow {
  id: number;
  slug: string;
  title: string;
}

interface GameContentRow {
  content: string;
  game_id: number;
}

/**
 * 执行 D1 SQL 查询
 */
export async function executeD1Query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/d1/database/${D1_DATABASE_ID}/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CF_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql, params }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`D1 API 请求失败: ${response.status} - ${errorText}`);
  }

  const data = await response.json() as D1QueryResult<T>;
  if (!data.success) {
    throw new Error(`D1 查询失败: ${data.errors?.map(e => e.message).join(', ')}`);
  }

  return data.result[0]?.results || [];
}

/**
 * 获取所有游戏列表
 */
export async function listGames(): Promise<GameRow[]> {
  return executeD1Query<GameRow>('SELECT id, slug, title FROM Games ORDER BY id DESC');
}

/**
 * 根据 ID 或 slug 获取游戏内容
 */
export async function getGameContent(idOrSlug: string): Promise<{ game: GameRow; content: string } | null> {
  const isNumeric = /^\d+$/.test(idOrSlug);
  
  let games: GameRow[];
  if (isNumeric) {
    games = await executeD1Query<GameRow>('SELECT id, slug, title FROM Games WHERE id = ?', [parseInt(idOrSlug)]);
  } else {
    games = await executeD1Query<GameRow>('SELECT id, slug, title FROM Games WHERE slug = ?', [idOrSlug]);
  }

  if (games.length === 0) {
    return null;
  }

  const game = games[0];
  const contents = await executeD1Query<GameContentRow>(
    'SELECT content FROM GameContent WHERE game_id = ?',
    [game.id]
  );

  if (contents.length === 0) {
    return null;
  }

  return { game, content: contents[0].content };
}

/**
 * 更新游戏内容
 */
export async function updateGameContent(gameId: number, content: string): Promise<void> {
  await executeD1Query(
    'UPDATE GameContent SET content = ? WHERE game_id = ?',
    [content, gameId]
  );
}
