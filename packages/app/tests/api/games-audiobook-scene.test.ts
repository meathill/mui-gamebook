import { beforeEach, describe, expect, it, vi } from 'vitest';

const bucket = {
  get: vi.fn(),
};

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn(() => ({ env: { ASSETS_BUCKET: bucket } })),
}));

import { GET } from '@/app/api/games/[slug]/audiobook/[sceneId]/route';

function makeParams(slug = 'test-game', sceneId = 'start') {
  return { params: Promise.resolve({ slug, sceneId }) };
}

describe('GET /api/games/[slug]/audiobook/[sceneId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('场景没有生成过有声书时返回 404，而不是抛错', async () => {
    bucket.get.mockResolvedValue(null);

    const res = await GET(new Request('http://localhost'), makeParams());

    expect(res.status).toBe(404);
    expect(bucket.get).toHaveBeenCalledWith('audiobook/test-game/scenes/start.json');
  });

  it('存在时返回 fragment 内容，并带公共缓存头', async () => {
    const fragment = {
      sceneId: 'start',
      clips: [
        {
          speaker: 'narrator',
          voice: 'mimo_default',
          text: '你好',
          url: 'https://cdn.x.com/a.wav',
          mimeType: 'audio/wav',
        },
      ],
    };
    bucket.get.mockResolvedValue({ json: vi.fn().mockResolvedValue(fragment) });

    const res = await GET(new Request('http://localhost'), makeParams());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(fragment);
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=60');
  });

  it('R2 bucket 未配置时返回 500', async () => {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    (getCloudflareContext as ReturnType<typeof vi.fn>).mockReturnValueOnce({ env: {} });

    const res = await GET(new Request('http://localhost'), makeParams());

    expect(res.status).toBe(500);
  });
});
