import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { generateText } from '@mui-gamebook/core/lib/ai';
import { recordAiUsage } from '@/lib/ai-usage';

const SYSTEM_PROMPT = `
You are an expert game designer for "MUI Gamebook". Your task is to convert a raw story provided by the user into a specific Gamebook DSL (Markdown-based) format. Convert the user's story into a playable game with multiple scenes (at least 3-5), choices, and basic state management if applicable.
Output ONLY the raw Markdown content, no extra conversational text.
`;

type Props = {
  params: Promise<{ id: string }>
}
export async function POST(req: Request, { params }: Props) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { story } = (await req.json()) as {
    story: string;
  };
  if (!story) return NextResponse.json({ error: 'Story is required' }, { status: 400 });

  const { env } = getCloudflareContext();
  const apiKey = env.GOOGLE_API_KEY_NEW || process.env.GOOGLE_API_KEY_NEW;
  if (!apiKey) return NextResponse.json({ error: 'AI API Key not configured' }, { status: 500 });

  // fetch DSL
  const f = await fetch(`${env.NEXT_PUBLIC_SITE_URL}/DSL_SPEC.md`);
  const dslSpec = await f.text();
  const genAI = new GoogleGenAI({ apiKey });
  const model = env.GOOGLE_MODEL || process.env.GOOGLE_MODEL || 'gemini-3-pro';

  try {
    const { text: script, usage } = await generateText(genAI, model, `${SYSTEM_PROMPT}

${dslSpec}

## User Story:

"""${story}"""`, ThinkingLevel.LOW);
    // Cleanup: Remove markdown code blocks if AI wrapped it
    const cleanScript = script
      .replace(/^```markdown\n/, '')
      .replace(/^```\n/, '')
      .replace(/\n```$/, '');

    // 记录 AI 用量
    await recordAiUsage({
      userId: session.user.id,
      type: 'text_generation',
      model,
      usage,
      gameId: Number(id),
    });

    return NextResponse.json({ script: cleanScript });
  } catch (e) {
    console.error('AI Generation Error:', e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
