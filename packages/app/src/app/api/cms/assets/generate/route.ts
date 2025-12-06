import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-server';
import { generateAndUploadImage } from '@/lib/ai-service';
import { recordAiUsage } from '@/lib/ai-usage';
import { checkUserUsageLimit } from '@/lib/usage-limit';

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 检查用量限制
  const usageCheck = await checkUserUsageLimit(session.user.id);
  if (!usageCheck.allowed) {
    return NextResponse.json({ error: usageCheck.message }, { status: 429 });
  }

  try {
    const { prompt, gameId, type } = (await req.json()) satisfies {
      prompt: string;
      gameId: string;
      type: string;
    };
    if (!prompt || !gameId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    if (type !== 'ai_image') {
        return NextResponse.json({ error: 'Only ai_image is supported currently' }, { status: 400 });
    }

    const fileName = `images/${gameId}/${Date.now()}.png`;
    const { url, usage, model } = await generateAndUploadImage(prompt, fileName);

    // 记录 AI 用量
    await recordAiUsage({
      userId: session.user.id,
      type: 'image_generation',
      model,
      usage,
    });

    return NextResponse.json({ url });
  } catch (e: unknown) {
    console.error('Generate asset error:', e);
    return NextResponse.json({ error: (e as Error).message || String(e) }, { status: 500 });
  }
}
