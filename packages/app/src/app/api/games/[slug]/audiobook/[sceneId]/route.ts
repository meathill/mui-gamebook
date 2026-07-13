import { getCloudflareContext } from '@opennextjs/cloudflare';
import { NextResponse } from 'next/server';

interface Params {
  params: Promise<{ slug: string; sceneId: string }>;
}

/**
 * 公开只读：给游戏播放器拉取某个场景已生成的有声书 clip 列表
 * 不需要鉴权——跟游戏本身的公开阅读内容一样，生成好的语音也是公开可播放的。
 * 找不到就是这个场景还没生成有声书（或者从未生成过），前端应该回退到旧的
 * 单条 audio_url 播放逻辑，而不是当作错误处理。
 */
export async function GET(_req: Request, { params }: Params) {
  const { slug, sceneId } = await params;
  const { env } = getCloudflareContext();

  const bucket = env.ASSETS_BUCKET;
  if (!bucket) {
    return NextResponse.json({ error: "R2 Bucket 'ASSETS_BUCKET' not found" }, { status: 500 });
  }

  const object = await bucket.get(`audiobook/${slug}/scenes/${sceneId}.json`);
  if (!object) {
    return NextResponse.json({ error: 'Audiobook not found for this scene' }, { status: 404 });
  }

  const data = await object.json();
  return NextResponse.json(data, { headers: { 'Cache-Control': 'public, max-age=60' } });
}
