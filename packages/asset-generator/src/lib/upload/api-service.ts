export interface GameMetadata {
  title: string;
  slug: string;
  content: string;
  ownerId?: string;
  description?: string;
  backgroundStory?: string;
  coverImage?: string;
  tags?: string[];
}

export interface MinigameData {
  name: string;
  description?: string;
  prompt: string;
  code: string;
  variables?: Record<string, string>;
  ownerId?: string;
}

export class ApiService {
  private encryptionKey: string;
  private baseUrl: string;

  constructor(baseUrl: string, adminPassword: string) {
    this.baseUrl = baseUrl;
    this.encryptionKey = adminPassword;
  }

  private async request(path: string, method: string, body: any) {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.encryptionKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API Error ${res.status}: ${text}`);
    }
    return res.json();
  }

  async uploadAsset(fileName: string, content: Buffer, contentType: string, gameSlug: string): Promise<string> {
    const base64 = content.toString('base64');
    const res = await this.request('/api/agent/assets/upload', 'POST', {
      gameSlug,
      fileName,
      base64,
      contentType,
    });
    return res.url;
  }

  async submitGame(data: GameMetadata): Promise<void> {
    await this.request('/api/agent/games', 'POST', data);
  }

  async submitMinigames(minigames: MinigameData[]): Promise<void> {
    if (minigames.length === 0) return;
    await this.request('/api/agent/minigames', 'POST', minigames);
  }
}
