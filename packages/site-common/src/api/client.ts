/**
 * Admin API 客户端
 * 用于从 admin 站点获取游戏数据
 */

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

export interface ApiClientConfig {
  baseUrl: string;
  revalidate?: number;
}

/**
 * 创建 API 客户端
 */
export function createApiClient(config: ApiClientConfig) {
  const { baseUrl, revalidate = 60 } = config;

  return {
    /**
     * 获取已发布的游戏列表
     */
    async getGames(): Promise<Game[]> {
      try {
        const response = await fetch(`${baseUrl}/api/games`, {
          next: { revalidate },
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
    },

    /**
     * 获取单个游戏详情
     */
    async getGame(slug: string): Promise<Game | null> {
      try {
        const response = await fetch(`${baseUrl}/api/games/${slug}`, {
          next: { revalidate },
        });

        if (!response.ok) {
          return null;
        }

        return response.json();
      } catch (error) {
        console.error('Error fetching game:', error);
        return null;
      }
    },

    /**
     * 获取游戏的可玩数据
     */
    async getPlayableGame(slug: string) {
      try {
        const response = await fetch(`${baseUrl}/api/games/${slug}/play`, {
          next: { revalidate },
        });

        if (!response.ok) {
          return null;
        }

        return response.json();
      } catch (error) {
        console.error('Error fetching playable game:', error);
        return null;
      }
    },
  };
}
