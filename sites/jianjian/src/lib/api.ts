/**
 * Admin API 封装
 * 用于从 admin.jianjian.com 获取数据
 */

import type { Game as FullGame, PlayableGame } from '@mui-gamebook/parser/src/types';
import { toPlayableGame } from '@mui-gamebook/parser/src/utils';
import { getCloudflareContext } from '@opennextjs/cloudflare';

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
  const { env } = getCloudflareContext();
  try {
    const response = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/games`, {
      next: { revalidate: 60 }, // 缓存 60 秒
    });

    if (!response.ok) {
      console.error('Failed to fetch games:', response.status);
      return [];
    }

    const data = (await response.json()) as Game[] | { games?: Game[] };
    // API 可能返回数组或 { games: [...] } 格式
    return Array.isArray(data) ? data : data.games || [];
  } catch (error) {
    console.error('Error fetching games:', error);
    return [];
  }
}

/**
 * 获取单个游戏详情
 */
export async function getGame(slug: string): Promise<Game | null> {
  const { env } = getCloudflareContext();
  try {
    const response = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/games/${slug}`, {
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
export async function getPlayableGame(slug: string): Promise<PlayableGame | null> {
  const { env } = getCloudflareContext();
  try {
    const response = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/games/${slug}`, {
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as FullGame;
    // API 返回完整的 Game 数据，使用 toPlayableGame 转换
    return toPlayableGame(data);
  } catch (error) {
    console.error('Error fetching playable game:', error);
    return null;
  }
}
