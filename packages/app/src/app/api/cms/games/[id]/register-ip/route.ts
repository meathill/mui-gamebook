import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-server';
import { drizzle } from 'drizzle-orm/d1';
import { games, user } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { createStoryClient, uploadMetadataToIpfs, registerGameAsIp, type IpMetadataInput } from '@/lib/story-protocol';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/cms/games/[id]/register-ip
 * 将游戏注册为 Story Protocol IP Asset
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { id } = await params;
    const gameId = parseInt(id, 10);
    if (isNaN(gameId)) {
      return NextResponse.json({ error: '无效的游戏 ID' }, { status: 400 });
    }

    // 获取环境变量
    const { env } = getCloudflareContext();
    // 这些环境变量需要在 Cloudflare 配置
    const privateKey = env.STORY_PRIVATE_KEY;
    const pinataJwt = env.PINATA_JWT;

    if (!privateKey) {
      return NextResponse.json({ error: 'Story Protocol 私钥未配置' }, { status: 500 });
    }

    if (!pinataJwt) {
      return NextResponse.json({ error: 'Pinata JWT 未配置' }, { status: 500 });
    }

    const db = drizzle(env.DB);

    // 获取游戏信息
    const [game] = await db.select().from(games).where(eq(games.id, gameId)).limit(1);

    if (!game) {
      return NextResponse.json({ error: '游戏不存在' }, { status: 404 });
    }

    // 验证所有权
    if (game.ownerId !== session.user.id) {
      return NextResponse.json({ error: '您没有权限注册此游戏的 IP' }, { status: 403 });
    }

    // 检查是否已经注册
    if (game.ipId) {
      return NextResponse.json(
        {
          error: '此游戏已注册为 IP Asset',
          ipId: game.ipId,
          explorerUrl: `https://aeneid.explorer.story.foundation/ipa/${game.ipId}`,
        },
        { status: 400 },
      );
    }

    // 获取用户信息
    const [owner] = await db.select().from(user).where(eq(user.id, session.user.id)).limit(1);

    // 准备 IP 元数据
    const metadata: IpMetadataInput = {
      title: game.title,
      description: game.description || `互动故事：${game.title}`,
      creatorName: owner?.name || '匿名创作者',
      creatorEmail: owner?.email || '',
      coverImage: game.coverImage || undefined,
      createdAt: game.createdAt?.toISOString() || new Date().toISOString(),
    };

    // 创建 Story Protocol 客户端
    const { storyClient } = createStoryClient(`0x${privateKey}`);

    // 上传元数据到 IPFS
    console.log('[Story] 上传元数据到 IPFS...');
    const metadataUri = await uploadMetadataToIpfs(metadata, pinataJwt);
    console.log('[Story] 元数据 URI:', metadataUri);

    // 注册 IP Asset
    console.log('[Story] 注册 IP Asset...');
    const result = await registerGameAsIp(storyClient, metadata, metadataUri);
    console.log('[Story] 注册成功:', result);

    // 更新数据库
    await db
      .update(games)
      .set({
        ipId: result.ipId,
        ipTxHash: result.txHash,
        ipTokenId: result.tokenId.toString(),
        ipRegisteredAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(games.id, gameId));

    return NextResponse.json({
      success: true,
      ipId: result.ipId,
      txHash: result.txHash,
      tokenId: result.tokenId.toString(),
      explorerUrl: result.explorerUrl,
    });
  } catch (error) {
    console.error('[Story] 注册 IP 失败:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '注册 IP 失败',
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/cms/games/[id]/register-ip
 * 获取游戏的 IP 注册状态
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { id } = await params;
    const gameId = parseInt(id, 10);
    if (isNaN(gameId)) {
      return NextResponse.json({ error: '无效的游戏 ID' }, { status: 400 });
    }

    const { env } = getCloudflareContext();
    const db = drizzle(env.DB);

    // 获取游戏信息
    const [game] = await db
      .select({
        id: games.id,
        title: games.title,
        ownerId: games.ownerId,
        ipId: games.ipId,
        ipTxHash: games.ipTxHash,
        ipTokenId: games.ipTokenId,
        ipRegisteredAt: games.ipRegisteredAt,
      })
      .from(games)
      .where(eq(games.id, gameId))
      .limit(1);

    if (!game) {
      return NextResponse.json({ error: '游戏不存在' }, { status: 404 });
    }

    // 验证所有权
    if (game.ownerId !== session.user.id) {
      return NextResponse.json({ error: '您没有权限查看此游戏的 IP 信息' }, { status: 403 });
    }

    if (!game.ipId) {
      return NextResponse.json({
        registered: false,
      });
    }

    return NextResponse.json({
      registered: true,
      ipId: game.ipId,
      txHash: game.ipTxHash,
      tokenId: game.ipTokenId,
      registeredAt: game.ipRegisteredAt?.toISOString(),
      explorerUrl: `https://aeneid.explorer.story.foundation/ipa/${game.ipId}`,
    });
  } catch (error) {
    console.error('[Story] 获取 IP 状态失败:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '获取 IP 状态失败',
      },
      { status: 500 },
    );
  }
}
