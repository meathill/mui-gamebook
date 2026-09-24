import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import { NextResponse } from 'next/server';
import slugify from 'slugify';
import { getUserAiPermissions, resolveTextProvider } from '@/lib/ai-permissions';
import { createAiProvider } from '@/lib/ai-provider-factory';
import { recordAiUsage } from '@/lib/ai-usage';
import { getSession } from '@/lib/auth-server';
import {
  buildChatHistory,
  CHAT_FUNCTION_DECLARATIONS,
  ChatRequest,
  MAX_CHAT_IMAGES,
} from '@/lib/editor/chat-declarations';
import { getManagedGame } from '@/lib/game-access';
import { getConfig } from '@/lib/config';
import { checkUserUsageLimit } from '@/lib/usage-limit';

type Props = {
  params: Promise<{ id: string }>;
};

export async function POST(req: Request, { params }: Props) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 检查用量限制
  const usageCheck = await checkUserUsageLimit(session.user.id);
  if (!usageCheck.allowed) {
    return NextResponse.json({ error: usageCheck.message }, { status: 429 });
  }

  const { id } = await params;
  const { message, context, history, provider: requestedProvider, images } = (await req.json()) as ChatRequest;

  if (!message) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }

  if (images && images.length > MAX_CHAT_IMAGES) {
    return NextResponse.json({ error: `最多支持 ${MAX_CHAT_IMAGES} 张参考图` }, { status: 400 });
  }

  // 校验游戏归属（所有者或 root）
  const { env } = getCloudflareContext();
  const game = await getManagedGame(drizzle(env.DB), Number(id), session);
  if (!game) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }

  // 参考图必须是本游戏的 R2 素材（防盗链其他游戏/外部 URL）
  if (images && images.length > 0) {
    const gameSlug = slugify(String(game.slug || game.title || 'game'), { lower: true });
    const publicDomain = env.ASSETS_PUBLIC_DOMAIN || process.env.ASSETS_PUBLIC_DOMAIN || '';
    const allowedPrefix = publicDomain ? `${publicDomain}/images/${gameSlug}/` : `/images/${gameSlug}/`;
    const bad = images.find((url) => typeof url !== 'string' || !url.includes(allowedPrefix));
    if (bad) {
      return NextResponse.json({ error: '参考图须为本游戏已上传的素材' }, { status: 400 });
    }
  }

  // 按用户权限解析文本提供者；创建失败（如密钥缺失）在进入 SSE 前返回 JSON 错误
  const permissions = await getUserAiPermissions(session.user);
  const providerType = resolveTextProvider(permissions, requestedProvider);
  const clientSessionId = req.headers.get('x-opencode-session') || req.headers.get('x-session-id') || undefined;
  let provider: Awaited<ReturnType<typeof createAiProvider>>;
  try {
    provider = await createAiProvider(providerType, {
      sessionId: clientSessionId,
      gameId: id,
    });
  } catch (error) {
    console.error('Chat provider init error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }

  // 构建上下文提示
  const contextParts: string[] = [];
  if (context.story) {
    contextParts.push(`## 用户原始故事\n\n${context.story}`);
  }
  if (context.dsl) {
    contextParts.push(`## 当前剧本\n\n\`\`\`markdown\n${context.dsl}\n\`\`\``);
  }
  if (context.characters && Object.keys(context.characters).length > 0) {
    const charList = Object.entries(context.characters)
      .map(([charId, char]) => `- ${charId}: ${char.name}${char.description ? ` - ${char.description}` : ''}`)
      .join('\n');
    contextParts.push(`## 角色定义\n\n${charList}`);
  }
  if (context.variables && Object.keys(context.variables).length > 0) {
    const varList = Object.entries(context.variables)
      .map(([name, value]) => `- ${name}: ${JSON.stringify(value)}`)
      .join('\n');
    contextParts.push(`## 变量定义\n\n${varList}`);
  }

  const userMessage =
    contextParts.length > 0 ? `${contextParts.join('\n\n')}\n\n---\n\n## 用户请求\n\n${message}` : message;
  const userMessageWithImages =
    images && images.length > 0
      ? `${userMessage}\n\n（本次附带 ${images.length} 张参考图，请结合图片内容理解需求）`
      : userMessage;

  // 创建 SSE 响应流
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // 检查 provider 是否支持 chatWithTools
        if (!provider.chatWithTools) {
          throw new Error('当前 AI 提供者不支持 function calling');
        }

        const response = await provider
          .chatWithTools(buildChatHistory(history, userMessageWithImages, images), CHAT_FUNCTION_DECLARATIONS)
          .catch((e: Error) => {
            // 部分文本模型不支持多模态输入：不静默丢图，直接报错提示切换 provider
            if (images && images.length > 0) {
              throw new Error(`${e.message}（本次携带参考图，若当前模型不支持图片请切换 provider 重试）`);
            }
            throw e;
          });

        const config = await getConfig();
        const modelMap: Record<string, string> = {
          opencode: config.opencodeTextModel,
          google: config.googleTextModel,
          openai: config.openaiTextModel,
          mimo: config.mimoTextModel,
          anthropic: config.anthropicTextModel,
        };
        const modelName = modelMap[providerType] || providerType;

        // 记录 AI 用量
        await recordAiUsage({
          userId: session.user.id,
          type: 'chat',
          model: modelName,
          usage: response.usage,
          gameId: Number(id),
        });

        // 处理响应
        if (response.text) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', content: response.text })}\n\n`));
        }

        if (response.functionCalls && response.functionCalls.length > 0) {
          for (const fc of response.functionCalls) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: 'function_call',
                  name: fc.name,
                  args: fc.args,
                })}\n\n`,
              ),
            );
          }
        }

        if (!response.text && (!response.functionCalls || response.functionCalls.length === 0)) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'error', content: '无法获取 AI 响应' })}\n\n`),
          );
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
        controller.close();
      } catch (error) {
        console.error('Chat API Error:', error);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: 'error',
              content: (error as Error).message,
            })}\n\n`,
          ),
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
