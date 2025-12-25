import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { createAiProvider } from '@/lib/ai-provider-factory';
import { recordAiUsage } from '@/lib/ai-usage';
import { checkUserUsageLimit } from '@/lib/usage-limit';

const SYSTEM_PROMPT = `
You are an expert game designer for "MUI Gamebook". Your task is to convert a raw story provided by the user into a specific Gamebook DSL (Markdown-based) format. Convert the user's story into a playable game with multiple scenes (at least 3-5), choices, and basic state management if applicable.
Output ONLY the raw Markdown content, no extra conversational text.
`;

type Props = {
  params: Promise<{ id: string }>;
};
export async function POST(req: Request, { params }: Props) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 检查用量限制
  const usageCheck = await checkUserUsageLimit(session.user.id);
  if (!usageCheck.allowed) {
    return NextResponse.json({ error: usageCheck.message }, { status: 429 });
  }

  const { id } = await params;
  const { story } = (await req.json()) as {
    story: string;
  };
  if (!story) return NextResponse.json({ error: 'Story is required' }, { status: 400 });

  const { env } = getCloudflareContext();

  // fetch DSL
  const f = await fetch(`${env.NEXT_PUBLIC_SITE_URL}/DSL_SPEC.md`);
  const dslSpec = await f.text();

  try {
    // 使用 AI Provider 工厂创建提供者
    const provider = await createAiProvider();
    const { text: script, usage } = await provider.generateText(
      `${SYSTEM_PROMPT}

${dslSpec}

## User Story:

"""${story}"""`,
      { thinking: true },
    );
    // Cleanup: Remove markdown code blocks if AI wrapped it
    const cleanScript = script
      .replace(/^```markdown\n/, '')
      .replace(/^```\n/, '')
      .replace(/\n```$/, '');

    // 记录 AI 用量
    await recordAiUsage({
      userId: session.user.id,
      type: 'text_generation',
      model: provider.type,
      usage,
      gameId: Number(id),
    });

    return NextResponse.json({ script: cleanScript });
  } catch (e) {
    console.error('AI Generation Error:', e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
