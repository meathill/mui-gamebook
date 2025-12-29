/**
 * AI Chatbot 的 function 声明
 * 定义 AI 可以调用的函数，用于修改剧本
 */
import type { FunctionDeclaration } from '@mui-gamebook/core/lib/ai-provider';

export const CHAT_FUNCTION_DECLARATIONS: FunctionDeclaration[] = [
  // 场景操作
  {
    name: 'updateScene',
    description: '更新指定场景的完整内容（慎用，会覆盖整个场景）',
    parameters: {
      type: 'object',
      properties: {
        sceneId: { type: 'string', description: '场景 ID' },
        content: { type: 'string', description: '新的场景内容（Markdown 格式）' },
      },
      required: ['sceneId', 'content'],
    },
  },
  {
    name: 'updateSceneText',
    description: '只更新场景的文案内容，不影响其他属性（推荐使用）',
    parameters: {
      type: 'object',
      properties: {
        sceneId: { type: 'string', description: '场景 ID' },
        text: { type: 'string', description: '新的文案内容（Markdown 格式）' },
      },
      required: ['sceneId', 'text'],
    },
  },
  {
    name: 'updateSceneImagePrompt',
    description: '只更新场景的图片生成 prompt，不影响其他属性（推荐使用）',
    parameters: {
      type: 'object',
      properties: {
        sceneId: { type: 'string', description: '场景 ID' },
        imagePrompt: { type: 'string', description: '新的图片生成 prompt' },
      },
      required: ['sceneId', 'imagePrompt'],
    },
  },
  {
    name: 'addScene',
    description: '添加新场景',
    parameters: {
      type: 'object',
      properties: {
        sceneId: { type: 'string', description: '新场景的 ID' },
        content: { type: 'string', description: '场景内容（Markdown 格式）' },
        afterSceneId: { type: 'string', description: '在哪个场景之后添加（可选）' },
      },
      required: ['sceneId', 'content'],
    },
  },
  {
    name: 'deleteScene',
    description: '删除场景',
    parameters: {
      type: 'object',
      properties: {
        sceneId: { type: 'string', description: '要删除的场景 ID' },
      },
      required: ['sceneId'],
    },
  },
  {
    name: 'renameScene',
    description: '重命名场景',
    parameters: {
      type: 'object',
      properties: {
        oldId: { type: 'string', description: '原场景 ID' },
        newId: { type: 'string', description: '新场景 ID' },
      },
      required: ['oldId', 'newId'],
    },
  },
  // 选项操作
  {
    name: 'addChoice',
    description: '为场景添加选项',
    parameters: {
      type: 'object',
      properties: {
        sceneId: { type: 'string', description: '场景 ID' },
        text: { type: 'string', description: '选项文本' },
        targetSceneId: { type: 'string', description: '目标场景 ID' },
        condition: { type: 'string', description: '条件表达式（可选）' },
        stateChange: { type: 'string', description: '状态变更表达式（可选）' },
      },
      required: ['sceneId', 'text', 'targetSceneId'],
    },
  },
  {
    name: 'updateChoice',
    description: '更新场景中选项的多个属性（慎用）',
    parameters: {
      type: 'object',
      properties: {
        sceneId: { type: 'string', description: '场景 ID' },
        choiceIndex: { type: 'integer', description: '选项索引（从 0 开始）' },
        text: { type: 'string', description: '新的选项文本（可选）' },
        targetSceneId: { type: 'string', description: '新的目标场景 ID（可选）' },
        condition: { type: 'string', description: '新的条件表达式（可选）' },
        stateChange: { type: 'string', description: '新的状态变更表达式（可选）' },
      },
      required: ['sceneId', 'choiceIndex'],
    },
  },
  {
    name: 'updateChoiceText',
    description: '只更新选项文本，不影响其他属性（推荐使用）',
    parameters: {
      type: 'object',
      properties: {
        sceneId: { type: 'string', description: '场景 ID' },
        choiceIndex: { type: 'integer', description: '选项索引（从 0 开始）' },
        text: { type: 'string', description: '新的选项文本' },
      },
      required: ['sceneId', 'choiceIndex', 'text'],
    },
  },
  {
    name: 'updateChoiceTarget',
    description: '只更新选项的目标场景，不影响其他属性（推荐使用）',
    parameters: {
      type: 'object',
      properties: {
        sceneId: { type: 'string', description: '场景 ID' },
        choiceIndex: { type: 'integer', description: '选项索引（从 0 开始）' },
        targetSceneId: { type: 'string', description: '新的目标场景 ID' },
      },
      required: ['sceneId', 'choiceIndex', 'targetSceneId'],
    },
  },
  {
    name: 'updateChoiceCondition',
    description: '只更新选项的条件表达式，不影响其他属性（推荐使用）',
    parameters: {
      type: 'object',
      properties: {
        sceneId: { type: 'string', description: '场景 ID' },
        choiceIndex: { type: 'integer', description: '选项索引（从 0 开始）' },
        condition: { type: 'string', description: '新的条件表达式' },
      },
      required: ['sceneId', 'choiceIndex', 'condition'],
    },
  },
  {
    name: 'deleteChoice',
    description: '删除场景中的选项',
    parameters: {
      type: 'object',
      properties: {
        sceneId: { type: 'string', description: '场景 ID' },
        choiceIndex: { type: 'integer', description: '选项索引（从 0 开始）' },
      },
      required: ['sceneId', 'choiceIndex'],
    },
  },
  // 变量操作
  {
    name: 'addVariable',
    description: '添加游戏变量',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: '变量名' },
        value: { type: 'string', description: '初始值' },
        visible: { type: 'boolean', description: '是否在界面显示' },
        label: { type: 'string', description: '显示名称' },
      },
      required: ['name', 'value'],
    },
  },
  {
    name: 'updateVariable',
    description: '更新游戏变量',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: '变量名' },
        value: { type: 'string', description: '新的值（可选）' },
        visible: { type: 'boolean', description: '是否在界面显示（可选）' },
        label: { type: 'string', description: '显示名称（可选）' },
      },
      required: ['name'],
    },
  },
  {
    name: 'deleteVariable',
    description: '删除游戏变量',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: '变量名' },
      },
      required: ['name'],
    },
  },
  // 角色操作
  {
    name: 'addCharacter',
    description: '添加 AI 角色',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: '角色 ID' },
        name: { type: 'string', description: '角色名称' },
        description: { type: 'string', description: '角色描述' },
        imagePrompt: { type: 'string', description: '图片生成提示词' },
      },
      required: ['id', 'name'],
    },
  },
  {
    name: 'updateCharacter',
    description: '更新 AI 角色',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: '角色 ID' },
        name: { type: 'string', description: '新名称（可选）' },
        description: { type: 'string', description: '新描述（可选）' },
        imagePrompt: { type: 'string', description: '新图片生成提示词（可选）' },
      },
      required: ['id'],
    },
  },
  {
    name: 'deleteCharacter',
    description: '删除 AI 角色',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: '角色 ID' },
      },
      required: ['id'],
    },
  },
];

/**
 * AI 聊天助手的系统提示词
 */
export const CHAT_SYSTEM_PROMPT = `你是一个互动小说编辑助手。用户会向你描述他们想要对剧本做的修改，你需要理解他们的意图并调用相应的函数来完成修改。

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

/**
 * 聊天请求体类型
 */
export interface ChatRequest {
  message: string;
  context: {
    dsl: string;
    story?: string;
    characters?: Record<string, { name: string; description?: string }>;
    variables?: Record<string, unknown>;
  };
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

/**
 * 构建聊天历史记录
 */
export function buildChatHistory(
  history: ChatRequest['history'],
  currentUserMessageWithContext: string,
): Array<{ role: 'user' | 'model'; content: string }> {
  const messages: Array<{ role: 'user' | 'model'; content: string }> = [
    // 系统提示作为第一条用户消息
    { role: 'user', content: CHAT_SYSTEM_PROMPT },
    { role: 'model', content: '我明白了，我会根据你的请求帮助你编辑剧本。请告诉我你想做什么修改？' },
  ];

  // 添加历史对话（如果有）
  if (history && history.length > 0) {
    // 历史记录已包含当前消息，但需要把最后一条（当前消息）替换为带上下文的版本
    for (let i = 0; i < history.length; i++) {
      const msg = history[i];
      const isLastMessage = i === history.length - 1;
      messages.push({
        role: msg.role === 'user' ? 'user' : 'model',
        // 最后一条用户消息需要带上下文
        content: isLastMessage && msg.role === 'user' ? currentUserMessageWithContext : msg.content,
      });
    }
  } else {
    // 没有历史时，只添加当前消息（带上下文）
    messages.push({ role: 'user', content: currentUserMessageWithContext });
  }

  return messages;
}
