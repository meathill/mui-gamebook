import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-server';
import { generateAndStoreMiniGame } from '@/lib/ai-service';
import { recordAiUsage } from '@/lib/ai-usage';
import { checkUserUsageLimit } from '@/lib/usage-limit';
import { getCloudflareContext } from '@opennextjs/cloudflare';

interface MiniGameRecord {
  id: number;
  name: string;
  description: string | null;
  prompt: string;
  status: string;
  created_at: number;
}

/**
 * 获取用户的小游戏列表
 */
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';

    const { env } = getCloudflareContext();
    const DB = env.DB;
    if (!DB) throw new Error('数据库未配置');

    let query = 'SELECT id, name, description, prompt, status, created_at FROM Minigames WHERE owner_id = ?';
    const params: (string | number)[] = [session.user.id];

    if (search) {
      query += ' AND (name LIKE ? OR description LIKE ? OR prompt LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    query += ' ORDER BY created_at DESC';

    const result = await DB.prepare(query).bind(...params).all<MiniGameRecord>();

    return NextResponse.json({
      minigames: result.results.map((m) => ({
        id: m.id,
        name: m.name,
        description: m.description,
        prompt: m.prompt,
        status: m.status,
        createdAt: m.created_at,
      })),
    });
  } catch (e: unknown) {
    console.error('List minigames error:', e);
    return NextResponse.json({ error: (e as Error).message || String(e) }, { status: 500 });
  }
}

/**
 * 生成小游戏
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 检查用量限制
  const usageCheck = await checkUserUsageLimit(session.user.id);
  if (!usageCheck.allowed) {
    return NextResponse.json({ error: usageCheck.message }, { status: 429 });
  }

  try {
    const { prompt, name, variables } = (await req.json()) as {
      prompt: string;
      name?: string;
      variables?: Record<string, string>;
    };

    if (!prompt) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    const minigameName = name || `小游戏 ${new Date().toLocaleString('zh-CN')}`;

    const { id, url, usage, model } = await generateAndStoreMiniGame(
      prompt,
      session.user.id,
      minigameName,
      variables,
    );

    // 记录 AI 用量
    await recordAiUsage({
      userId: session.user.id,
      type: 'minigame_generation',
      model,
      usage,
    });

    return NextResponse.json({ id, url, name: minigameName });
  } catch (e: unknown) {
    console.error('Generate minigame error:', e);
    return NextResponse.json({ error: (e as Error).message || String(e) }, { status: 500 });
  }
}
