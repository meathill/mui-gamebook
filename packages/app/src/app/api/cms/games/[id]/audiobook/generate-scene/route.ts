import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { parse } from '@mui-gamebook/parser';
import { hasQuoteLikeCharacters, segmentTextWithProvider } from '@mui-gamebook/core/lib/audiobook/segmentation';
import { explodeSegmentsToSentences } from '@mui-gamebook/core/lib/audiobook/sentence-split';
import { resolveVoiceForSpeaker } from '@mui-gamebook/core/lib/audiobook/voice-assignment';
import { NARRATOR_SPEAKER_ID } from '@mui-gamebook/core/lib/audiobook/types';
import * as schema from '@/db/schema';
import type { AudiobookClip } from '@/lib/audiobook-types';
import { createAiProvider } from '@/lib/ai-provider-factory';
import { recordAiUsage } from '@/lib/ai-usage';
import { getSession } from '@/lib/auth-server';
import { getManagedGame } from '@/lib/game-access';
import { checkUserUsageLimit } from '@/lib/usage-limit';

interface Params {
  params: Promise<{ id: string }>;
}

/** 含 {{...}} 的动态插值/条件文本，暂时无法预生成语音，直接跳过 */
function hasDynamicContent(text: string): boolean {
  return text.includes('{{');
}

/**
 * 为单个场景生成分角色语音：说话人分段 → 按句切分 → 逐句 TTS → 存成该场景的
 * 音频 clip 列表（不拼接成一个文件——前端播放时按顺序依次播放，见 game-player
 * 的播放逻辑）。由编辑器"一键生成有声书"对话框逐场景调用，前端驱动整体进度。
 *
 * 已知局限：每个场景独立生成，不像 CLI 批处理工具那样维护跨场景的滚动上下文，
 * 所以"角色假扮/冒充身份说话"这类需要联系前情提要才能判断说话人的场景，这里
 * 分段准确率会低一些。
 */
export async function POST(req: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = session.user.id;

  const { id: gameIdParam } = await params;
  const gameId = Number(gameIdParam);

  const { env } = getCloudflareContext();
  const db = drizzle(env.DB);
  const ownedGame = await getManagedGame(db, gameId, session);
  if (!ownedGame) return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  const gameSlug = ownedGame.slug;

  const usageCheck = await checkUserUsageLimit(userId);
  if (!usageCheck.allowed) {
    return NextResponse.json({ error: usageCheck.message }, { status: 429 });
  }

  let sceneId: string;
  try {
    const body = (await req.json()) satisfies { sceneId: string };
    sceneId = body.sceneId;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  if (!sceneId) {
    return NextResponse.json({ error: 'Missing sceneId' }, { status: 400 });
  }

  const contentRecord = await db.select().from(schema.gameContent).where(eq(schema.gameContent.gameId, gameId)).get();
  if (!contentRecord) {
    return NextResponse.json({ error: 'Game content not found' }, { status: 404 });
  }

  const parseResult = parse(contentRecord.content);
  if (!parseResult.success) {
    return NextResponse.json({ error: parseResult.error }, { status: 500 });
  }

  const scene = parseResult.data.scenes[sceneId];
  if (!scene) {
    return NextResponse.json({ error: `Scene not found: ${sceneId}` }, { status: 404 });
  }

  const roster = parseResult.data.ai?.characters || {};

  const assetsBucket = env.ASSETS_BUCKET;
  if (!assetsBucket) {
    return NextResponse.json({ error: "R2 Bucket 'ASSETS_BUCKET' not found" }, { status: 500 });
  }
  const publicDomain = env.ASSETS_PUBLIC_DOMAIN || process.env.ASSETS_PUBLIC_DOMAIN;

  const provider = await createAiProvider('mimo');
  if (!provider.generateTTS) {
    return NextResponse.json({ error: '当前 provider 不支持 TTS' }, { status: 500 });
  }
  const generateTTS = provider.generateTTS.bind(provider);

  const voices: Record<string, string> = {};
  function resolveVoice(speaker: string): string {
    if (!(speaker in voices)) {
      voices[speaker] = resolveVoiceForSpeaker(speaker, roster);
    }
    return voices[speaker];
  }

  /** 场景内单个文本节点的说话人分段：无引号直接判定整段旁白，否则送 LLM（真实调用才记账） */
  async function segmentNodeText(content: string, nodeIndex: number) {
    if (!hasQuoteLikeCharacters(content)) {
      return [{ speaker: NARRATOR_SPEAKER_ID, text: content }];
    }
    const result = await segmentTextWithProvider(provider, content, {
      roster,
      sceneId,
      nodeIndex,
      precedingExcerpt: '',
    });
    if (result.usage) {
      await recordAiUsage({ userId, type: 'chat', model: provider.type, usage: result.usage, gameId });
    }
    return result.segments;
  }

  async function synthesizeClip(speaker: string, voice: string, text: string): Promise<AudiobookClip> {
    const result = await generateTTS(text, voice);
    await recordAiUsage({
      userId,
      type: 'audio_generation',
      model: provider.type,
      usage: { promptTokens: text.length, completionTokens: 0, totalTokens: text.length },
      gameId,
    });

    const fileName = `audiobook/${gameSlug}/clips/${sceneId}-${Date.now()}-${Math.random().toString(36).slice(2)}.wav`;
    await assetsBucket.put(fileName, result.buffer, {
      httpMetadata: { contentType: result.mimeType, cacheControl: 'public, max-age=31536000, immutable' },
    });

    return { speaker, voice, text, url: `${publicDomain}/${fileName}`, mimeType: result.mimeType };
  }

  try {
    const clips: AudiobookClip[] = [];

    for (let nodeIndex = 0; nodeIndex < scene.nodes.length; nodeIndex++) {
      const node = scene.nodes[nodeIndex];

      if (node.type === 'text') {
        if (hasDynamicContent(node.content)) continue;

        const segments = await segmentNodeText(node.content, nodeIndex);
        for (const sentence of explodeSegmentsToSentences(segments)) {
          const voice = resolveVoice(sentence.speaker);
          clips.push(await synthesizeClip(sentence.speaker, voice, sentence.text));
        }
        continue;
      }

      if (node.type === 'dialogue') {
        if (hasDynamicContent(node.content)) continue;

        // 对话节点自带结构化说话人（DSL v2 `@角色ID: 台词`），直接分段，零 LLM 成本
        for (const sentence of explodeSegmentsToSentences([{ speaker: node.speaker, text: node.content }])) {
          const voice = resolveVoice(sentence.speaker);
          clips.push(await synthesizeClip(sentence.speaker, voice, sentence.text));
        }
        continue;
      }

      if (node.type === 'choice') {
        if (hasDynamicContent(node.text)) continue;
        const voice = resolveVoice(NARRATOR_SPEAKER_ID);
        for (const sentence of explodeSegmentsToSentences([{ speaker: NARRATOR_SPEAKER_ID, text: node.text }])) {
          clips.push(await synthesizeClip(NARRATOR_SPEAKER_ID, voice, sentence.text));
        }
      }
    }

    const fragment = { sceneId, clips };
    await assetsBucket.put(`audiobook/${gameSlug}/scenes/${sceneId}.json`, JSON.stringify(fragment), {
      httpMetadata: { contentType: 'application/json', cacheControl: 'public, max-age=60' },
    });

    return NextResponse.json(fragment);
  } catch (e: unknown) {
    console.error('Audiobook scene generation error:', e);
    return NextResponse.json({ error: (e as Error).message || String(e) }, { status: 500 });
  }
}
