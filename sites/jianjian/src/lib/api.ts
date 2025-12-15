/**
 * Admin API 封装
 * 用于从 admin.jianjian.com 获取数据
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3020';

export interface Game {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  cover_image: string | null;
  tags: string[] | null;
  status: string;
  created_at: string;
  updated_at: string;
}

/**
 * 获取已发布的游戏列表
 */
export async function getGames(): Promise<Game[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/games`, {
      next: { revalidate: 60 }, // 缓存 60 秒
    });

    if (!response.ok) {
      console.error('Failed to fetch games:', response.status);
      return [];
    }

    const data = await response.json();
    return data.games || [];
  } catch (error) {
    console.error('Error fetching games:', error);
    return [];
  }
}

/**
 * 获取单个游戏详情
 */
export async function getGame(slug: string): Promise<Game | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/games/${slug}`, {
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching game:', error);
    return null;
  }
}

/**
 * 获取游戏的可玩数据
 */
export async function getPlayableGame(slug: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/games/${slug}/play`, {
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching playable game:', error);
    return null;
  }
}
