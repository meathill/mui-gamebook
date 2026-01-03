/**
 * API 客户端模块
 * 提供与服务器 API 交互的公共函数
 */

/**
 * 基础配置类型
 */
export interface BaseConfig {
  apiUrl: string;
  adminSecret: string;
  gameSlug: string;
}

/**
 * API 响应类型
 */
export interface GameResponse {
  id: number;
  content: string;
}

/**
 * 从 API 获取剧本
 */
export async function fetchGame(config: BaseConfig): Promise<GameResponse> {
  const res = await fetch(`${config.apiUrl}/api/admin/games/${config.gameSlug}`, {
    headers: { Authorization: `Bearer ${config.adminSecret}` },
  });

  if (!res.ok) {
    const error = (await res.json()) as { error: string };
    throw new Error(`获取剧本失败: ${error.error}`);
  }

  return (await res.json()) as GameResponse;
}

/**
 * 更新剧本到 API
 */
export async function updateGame(config: BaseConfig, content: string): Promise<void> {
  const res = await fetch(`${config.apiUrl}/api/admin/games/${config.gameSlug}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${config.adminSecret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
  });

  if (!res.ok) {
    const error = (await res.json()) as { error: string };
    throw new Error(`更新剧本失败: ${error.error}`);
  }
}
