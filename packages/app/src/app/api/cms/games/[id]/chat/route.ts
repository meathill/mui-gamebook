import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import { NextResponse } from 'next/server';
import { getUserAiPermissions, resolveTextProvider } from '@/lib/ai-permissions';
import { createAiProvider } from '@/lib/ai-provider-factory';
import { recordAiUsage } from '@/lib/ai-usage';
import { getSession } from '@/lib/auth-server';
import { buildChatHistory, CHAT_FUNCTION_DECLARATIONS, ChatRequest } from '@/lib/editor/chat-declarations';
import { getManagedGame } from '@/lib/game-access';
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
  const { message, context, history, provider: requestedProvider } = (await req.json()) as ChatRequest;

  if (!message) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }

  // 校验游戏归属（所有者或 root）
  const { env } = getCloudflareContext();
  const game = await getManagedGame(drizzle(env.DB), Number(id), session);
  if (!game) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }

  // 按用户权限解析文本提供者；创建失败（如密钥缺失）在进入 SSE 前返回 JSON 错误
  const permissions = await getUserAiPermissions(session.user);
  const providerType = resolveTextProvider(permissions, requestedProvider);
  let provider: Awaited<ReturnType<typeof createAiProvider>>;
  try {
    provider = await createAiProvider(providerType);
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

  // 创建 SSE 响应流
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // 检查 provider 是否支持 chatWithTools
        if (!provider.chatWithTools) {
          throw new Error('当前 AI 提供者不支持 function calling');
        }

        const response = await provider.chatWithTools(
          buildChatHistory(history, userMessage),
          CHAT_FUNCTION_DECLARATIONS,
        );

        // 记录 AI 用量
        await recordAiUsage({
          userId: session.user.id,
          type: 'chat',
          model: provider.type,
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
