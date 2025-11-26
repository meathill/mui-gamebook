import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-server';
import { generateAndUploadImage } from '@/lib/ai-service';

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { prompt, gameSlug, type } = (await req.json()) satisfies {
      prompt: string;
      gameSlug: string;
      type: string;
    };
    if (!prompt || !gameSlug) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    if (type !== 'ai_image') {
        return NextResponse.json({ error: 'Only ai_image is supported currently' }, { status: 400 });
    }

    const fileName = `images/${gameSlug}/${Date.now()}.png`;
    const url = await generateAndUploadImage(prompt, fileName);

    return NextResponse.json({ url });
  } catch (e: unknown) {
    console.error('Generate asset error:', e);
    return NextResponse.json({ error: (e as Error).message || String(e) }, { status: 500 });
  }
}
