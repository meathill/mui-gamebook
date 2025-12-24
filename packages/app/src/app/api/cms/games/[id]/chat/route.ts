import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import { checkUserUsageLimit } from '@/lib/usage-limit';
import { recordAiUsage } from '@/lib/ai-usage';

// Function 声明 - AI 可调用的函数
const FUNCTION_DECLARATIONS: FunctionDeclaration[] = [
  // 场景操作
  {
    name: 'updateScene',
    description: '更新指定场景的内容',
    parameters: {
      type: Type.OBJECT,
      properties: {
        sceneId: { type: Type.STRING, description: '场景 ID' },
        content: { type: Type.STRING, description: '新的场景内容（Markdown 格式）' },
      },
      required: ['sceneId', 'content'],
    },
  },
  {
    name: 'addScene',
    description: '添加新场景',
    parameters: {
      type: Type.OBJECT,
      properties: {
        sceneId: { type: Type.STRING, description: '新场景的 ID' },
        content: { type: Type.STRING, description: '场景内容（Markdown 格式）' },
        afterSceneId: { type: Type.STRING, description: '在哪个场景之后添加（可选）' },
      },
      required: ['sceneId', 'content'],
    },
  },
  {
    name: 'deleteScene',
    description: '删除场景',
    parameters: {
      type: Type.OBJECT,
      properties: {
        sceneId: { type: Type.STRING, description: '要删除的场景 ID' },
      },
      required: ['sceneId'],
    },
  },
  {
    name: 'renameScene',
    description: '重命名场景',
    parameters: {
      type: Type.OBJECT,
      properties: {
        oldId: { type: Type.STRING, description: '原场景 ID' },
        newId: { type: Type.STRING, description: '新场景 ID' },
      },
      required: ['oldId', 'newId'],
    },
  },
  // 选项操作
  {
    name: 'addChoice',
    description: '为场景添加选项',
    parameters: {
      type: Type.OBJECT,
      properties: {
        sceneId: { type: Type.STRING, description: '场景 ID' },
        text: { type: Type.STRING, description: '选项文本' },
        targetSceneId: { type: Type.STRING, description: '目标场景 ID' },
        condition: { type: Type.STRING, description: '条件表达式（可选）' },
        stateChange: { type: Type.STRING, description: '状态变更表达式（可选）' },
      },
      required: ['sceneId', 'text', 'targetSceneId'],
    },
  },
  {
    name: 'updateChoice',
    description: '更新场景中的选项',
    parameters: {
      type: Type.OBJECT,
      properties: {
        sceneId: { type: Type.STRING, description: '场景 ID' },
        choiceIndex: { type: Type.INTEGER, description: '选项索引（从 0 开始）' },
        text: { type: Type.STRING, description: '新的选项文本（可选）' },
        targetSceneId: { type: Type.STRING, description: '新的目标场景 ID（可选）' },
        condition: { type: Type.STRING, description: '新的条件表达式（可选）' },
        stateChange: { type: Type.STRING, description: '新的状态变更表达式（可选）' },
      },
      required: ['sceneId', 'choiceIndex'],
    },
  },
  {
    name: 'deleteChoice',
    description: '删除场景中的选项',
    parameters: {
      type: Type.OBJECT,
      properties: {
        sceneId: { type: Type.STRING, description: '场景 ID' },
        choiceIndex: { type: Type.INTEGER, description: '选项索引（从 0 开始）' },
      },
      required: ['sceneId', 'choiceIndex'],
    },
  },
  // 变量操作
  {
    name: 'addVariable',
    description: '添加游戏变量',
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: '变量名' },
        value: { type: Type.STRING, description: '初始值' },
        visible: { type: Type.BOOLEAN, description: '是否在界面显示' },
        label: { type: Type.STRING, description: '显示名称' },
      },
      required: ['name', 'value'],
    },
  },
  {
    name: 'updateVariable',
    description: '更新游戏变量',
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: '变量名' },
        value: { type: Type.STRING, description: '新的值（可选）' },
        visible: { type: Type.BOOLEAN, description: '是否在界面显示（可选）' },
        label: { type: Type.STRING, description: '显示名称（可选）' },
      },
      required: ['name'],
    },
  },
  {
    name: 'deleteVariable',
    description: '删除游戏变量',
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: '变量名' },
      },
      required: ['name'],
    },
  },
  // 角色操作
  {
    name: 'addCharacter',
    description: '添加 AI 角色',
    parameters: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING, description: '角色 ID' },
        name: { type: Type.STRING, description: '角色名称' },
        description: { type: Type.STRING, description: '角色描述' },
        imagePrompt: { type: Type.STRING, description: '图片生成提示词' },
      },
      required: ['id', 'name'],
    },
  },
  {
    name: 'updateCharacter',
    description: '更新 AI 角色',
    parameters: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING, description: '角色 ID' },
        name: { type: Type.STRING, description: '新名称（可选）' },
        description: { type: Type.STRING, description: '新描述（可选）' },
        imagePrompt: { type: Type.STRING, description: '新图片生成提示词（可选）' },
      },
      required: ['id'],
    },
  },
  {
    name: 'deleteCharacter',
    description: '删除 AI 角色',
    parameters: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING, description: '角色 ID' },
      },
      required: ['id'],
    },
  },
];

// 系统提示词
const SYSTEM_PROMPT = `你是一个互动小说编辑助手。用户会向你描述他们想要对剧本做的修改，你需要理解他们的意图并调用相应的函数来完成修改。

你收到的上下文包括：
1. 用户的原始故事大纲（如果有）
2. 当前完整的剧本内容（DSL 格式）
3. 角色定义
4. 变量定义

请根据用户的请求，选择合适的函数来修改剧本。如果用户的请求不清楚，请先回复询问更多细节。

重要规则：
- 场景内容使用 Markdown 格式
- 选项格式为：* [选项文本] -> 目标场景ID (if: 条件) (set: 状态变更)
- 变量值可以是数字、字符串或布尔值
- 变量插值使用 {{变量名}} 语法`;

type Props = {
  params: Promise<{ id: string }>;
};

interface ChatRequest {
  message: string;
  context: {
    dsl: string;
    story?: string;
    characters?: Record<string, { name: string; description?: string }>;
    variables?: Record<string, unknown>;
  };
}

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
  const { message, context } = (await req.json()) as ChatRequest;

  if (!message) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }

  const { env } = getCloudflareContext();
  const apiKey = env.GOOGLE_API_KEY_NEW || process.env.GOOGLE_API_KEY_NEW;
  if (!apiKey) {
    return NextResponse.json({ error: 'AI API Key not configured' }, { status: 500 });
  }

  const genAI = new GoogleGenAI({ apiKey });
  const model = env.GOOGLE_MODEL || process.env.GOOGLE_MODEL || 'gemini-2.5-flash';

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
      .map(([id, char]) => `- ${id}: ${char.name}${char.description ? ` - ${char.description}` : ''}`)
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
        const response = await genAI.models.generateContent({
          model,
          contents: [
            { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
            { role: 'model', parts: [{ text: '我明白了，我会根据你的请求帮助你编辑剧本。请告诉我你想做什么修改？' }] },
            { role: 'user', parts: [{ text: userMessage }] },
          ],
          config: {
            tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }],
          },
        });

        // 记录 AI 用量
        const usage = response.usageMetadata;
        if (usage) {
          await recordAiUsage({
            userId: session.user.id,
            type: 'chat',
            model,
            usage: {
              promptTokens: usage.promptTokenCount ?? 0,
              completionTokens: usage.candidatesTokenCount ?? 0,
              totalTokens: usage.totalTokenCount ?? 0,
            },
            gameId: Number(id),
          });
        }

        // 处理响应
        const candidate = response.candidates?.[0];
        if (!candidate?.content?.parts) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'error', content: '无法获取 AI 响应' })}\n\n`),
          );
          controller.close();
          return;
        }

        for (const part of candidate.content.parts) {
          if (part.text) {
            // 文本响应
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', content: part.text })}\n\n`));
          }
          if (part.functionCall) {
            // Function call 响应
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: 'function_call',
                  name: part.functionCall.name,
                  args: part.functionCall.args,
                })}\n\n`,
              ),
            );
          }
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
