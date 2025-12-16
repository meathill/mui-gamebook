import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-server';
import { generateAndUploadTTS, type TTSVoiceName } from '@/lib/ai-service';
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
    const { text, gameId, voiceName } = (await req.json()) satisfies {
      text: string;
      gameId: string;
      voiceName?: TTSVoiceName;
    };

    if (!text || !gameId) {
      return NextResponse.json({ error: 'Missing fields: text and gameId are required' }, { status: 400 });
    }

    // 生成文件名
    const fileName = `audio/${gameId}/${Date.now()}.wav`;

    // 生成 TTS 并上传
    const { url } = await generateAndUploadTTS(text, fileName, voiceName || 'Aoede');

    return NextResponse.json({ url });
  } catch (e: unknown) {
    console.error('Generate TTS error:', e);
    return NextResponse.json({ error: (e as Error).message || String(e) }, { status: 500 });
  }
}
