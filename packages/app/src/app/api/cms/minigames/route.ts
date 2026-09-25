import { getCloudflareContext } from '@opennextjs/cloudflare';
import { NextResponse } from 'next/server';
import { getUserAiPermissions } from '@/lib/ai-permissions';
import { generateAndStoreMiniGame } from '@/lib/ai-service';
import { recordAiUsage } from '@/lib/ai-usage';
import { getSession } from '@/lib/auth-server';
import { getConfig } from '@/lib/config';
import {
  getDefaultTextModelForProvider,
  getUserAiPreferences,
  isPaidAiUser,
  resolveEffectiveTextSelection,
} from '@/lib/user-ai-settings';
import { checkUserUsageLimit } from '@/lib/usage-limit';
import { formatDateTime } from '@mui-gamebook/site-common/utils';

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

    const result = await DB.prepare(query)
      .bind(...params)
      .all<MiniGameRecord>();

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
    console.error('ListIcon minigames error:', e);
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
    const {
      prompt,
      name,
      variables,
      provider: requestedProvider,
      model: requestedModel,
    } = (await req.json()) as {
      prompt: string;
      name?: string;
      variables?: Record<string, string>;
      provider?: string;
      model?: string;
    };

    if (!prompt) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    const minigameName = name || `小游戏 ${formatDateTime(new Date())}`;

    // 按用户权限 + 自选模型解析实际 provider/model
    const appConfig = await getConfig();
    const permissions = await getUserAiPermissions(session.user);
    const [preferences, isPaid] = await Promise.all([
      getUserAiPreferences(session.user.id),
      isPaidAiUser(session.user),
    ]);
    const selection = resolveEffectiveTextSelection({
      permissionsProviders: permissions.providers,
      systemDefaultProvider: appConfig.defaultTextProvider,
      getSystemModel: (provider) => getDefaultTextModelForProvider(appConfig, provider),
      userPreference: preferences.text,
      isPaid,
      requestedProvider,
      requestedModel,
    });
    const { id, url, usage, model } = await generateAndStoreMiniGame(
      prompt,
      session.user.id,
      minigameName,
      variables,
      selection.provider,
      selection.model,
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
