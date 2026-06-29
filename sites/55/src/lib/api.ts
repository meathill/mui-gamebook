/**
 * API 封装
 * 从 CMS 获取游戏数据
 */

import type { Game as FullGame, PlayableGame } from '@mui-gamebook/parser/src/types';
import { toPlayableGame } from '@mui-gamebook/parser/src/utils';

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

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3020';

/**
 * 获取单个游戏详情
 */
export async function getGame(slug: string): Promise<Game | null> {
  try {
    const response = await fetch(`${API_URL}/api/games/${slug}`, {
      next: { revalidate: 60 },
    });

    if (!response.ok) return null;
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
  try {
    const response = await fetch(`${API_URL}/api/games/${slug}`, {
      next: { revalidate: 60 },
    });

    if (!response.ok) return null;

    const data = (await response.json()) as FullGame;
    return toPlayableGame(data);
  } catch (error) {
    console.error('Error fetching playable game:', error);
    return null;
  }
}
