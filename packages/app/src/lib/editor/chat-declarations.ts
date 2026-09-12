/**
 * AI Chatbot 的 function 声明
 * 定义 AI 可以调用的函数，用于修改剧本
 */
import type { ChatMessage, FunctionDeclaration } from '@mui-gamebook/core/lib/ai-provider';
import { WEBMCP_TOOLS } from '@mui-gamebook/webmcp';

/** 单次对话最多携带的参考图数量（前端上传 + 后端校验双拦） */
export const MAX_CHAT_IMAGES = 4;

/** chatbot 可调用的函数 = WebMCP 写工具子集（只读的 getDsl/listScenes 不进 function calling） */
export const CHAT_FUNCTION_DECLARATIONS: FunctionDeclaration[] = WEBMCP_TOOLS.filter((t) => !t.readonly).map((t) => ({
  name: t.name,
  description: t.description,
  parameters: t.inputSchema,
}));

/**
 * AI 聊天助手的系统提示词
 */
export const CHAT_SYSTEM_PROMPT = `你是一个互动小说编辑助手。用户会向你描述他们想要对剧本做的修改，你的职责是**直接调用函数完成修改**，而不是描述你打算怎么做。

你收到的上下文包括：
1. 用户的原始故事大纲（如果有）
2. 当前完整的剧本内容（DSL 格式）
3. 角色定义
4. 变量定义

工作方式：
- 默认直接行动：理解意图后立刻调用函数执行，不要输出"我可以帮你……"之类的计划性文字
- 批量执行：一次修改涉及多处时，在同一个回复里调用多个函数一次完成（例如新增场景 + 添加选项 + 更新变量）
- 主动补全设定：当用户请求或剧情隐含了新角色时，主动调用 addCharacter 补充角色定义（含 description 和 image_prompt）；隐含了新属性/资源/状态时，主动调用 addVariable 创建变量，并在相关场景选项中用 (set: ...) / (if: ...) 接入，让变量真正参与剧情
- 精细修改优先：改文案用 updateSceneText/updateChoiceText 这类细粒度函数，不要整段重写场景
- 仅在意图确实含糊、无法安全执行时才反问；能合理推断就直接做
- 行动之后用一两句话总结你做了什么，方便用户核对

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
  // 指定使用的 AI 提供者（须在用户许可列表内，否则回退用户默认）
  provider?: string;
  /** 参考图 R2 URL 列表（≤4，前端先上传再调用；后端校验归属） */
  images?: string[];
  context: {
    dsl: string;
    story?: string;
    characters?: Record<string, { name: string; description?: string }>;
    variables?: Record<string, unknown>;
  };
  history?: Array<{ role: 'user' | 'assistant'; content: string; images?: string[] }>;
}

/** 聊天历史里的图片不进 system 首轮，只挂在产生它的那条 user 消息上 */
function toChatContent(text: string, images?: string[]): ChatMessage['content'] {
  if (!images || images.length === 0) return text;
  return [{ type: 'text', text }, ...images.map((url) => ({ type: 'image_url' as const, url }))];
}

/**
 * 构建聊天历史记录
 */
export function buildChatHistory(
  history: ChatRequest['history'],
  currentUserMessageWithContext: string,
  currentImages?: string[],
): ChatMessage[] {
  const messages: ChatMessage[] = [
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
        // 最后一条用户消息需要带上下文（含本次参考图）；历史图片保留在各自的 user 消息上
        content:
          isLastMessage && msg.role === 'user'
            ? toChatContent(currentUserMessageWithContext, currentImages)
            : msg.role === 'user'
              ? toChatContent(msg.content, msg.images)
              : msg.content,
      });
    }
  } else {
    // 没有历史时，只添加当前消息（带上下文）
    messages.push({ role: 'user', content: toChatContent(currentUserMessageWithContext, currentImages) });
  }

  return messages;
}
