/**
 * AI Chatbot 的 function 声明与多轮工具会话协议。
 * 工具定义统一来自 @mui-gamebook/webmcp，读写工具全部开放给编辑器 chatbot。
 */
import type { ChatMessage, FunctionDeclaration } from '@mui-gamebook/core/lib/ai-provider';
import { WEBMCP_TOOLS } from '@mui-gamebook/webmcp';

/** 单次对话最多携带的参考图数量（前端上传 + 后端校验双拦） */
export const MAX_CHAT_IMAGES = 4;

/** 单条用户消息最多允许的工具执行轮次 */
export const MAX_CHAT_TOOL_ROUNDS = 4;

/** 单轮最多执行的工具数量，防止模型失控批量写入 */
export const MAX_TOOL_CALLS_PER_ROUND = 24;

/** chatbot 可调用的函数 = 全部 WebMCP 读写工具 */
export const CHAT_FUNCTION_DECLARATIONS: FunctionDeclaration[] = WEBMCP_TOOLS.map((tool) => ({
  name: tool.name,
  description: tool.description,
  parameters: tool.inputSchema,
}));

/**
 * AI 聊天助手的系统提示词。
 * 重点：先查后改、改完必验、失败必须纠正，禁止假装成功。
 */
export const CHAT_SYSTEM_PROMPT = `你是一个互动小说编辑助手。你通过工具直接读取和修改剧本，首要目标是**准确**：不确定就查，改完就验，失败就修正。

你每轮收到的上下文包括：
1. 用户的原始故事大纲（如果有）
2. 当前最新的完整剧本（DSL 格式）
3. 角色定义
4. 变量定义

可用工具：
- 读取：getDsl / listScenes / getScene / searchScenes / validateScript
- 场景：addScene / updateScene / updateSceneText / updateSceneImagePrompt / setSceneImage / deleteScene / renameScene / addDialogueLine / addRedirect
- 选项：addChoice / updateChoice / updateChoiceText / updateChoiceTarget / updateChoiceCondition / deleteChoice
- 变量与角色：addVariable / updateVariable / deleteVariable / addCharacter / updateCharacter / deleteCharacter

工作协议：
1. **先查后改**：场景 ID、选项序号、现有文案不确定时，先调用 listScenes / getScene / searchScenes。禁止臆造场景 ID 或 choiceIndex。
2. **精细修改优先**：改文案用 updateSceneText；改选项目标/条件用 updateChoiceTarget/updateChoiceCondition；只有用户明确要求重写整个场景时才用 updateScene。
3. **批量执行**：同一轮可以调用多个工具。新增场景 + 选项 + 变量应在同一轮完成；系统会按“增 → 删 → 改”排序，并保证前序新增对后续调用可见。
4. **破坏性操作先确认**：deleteScene / deleteVariable / deleteCharacter / renameScene / updateScene 前先用 getScene/listScenes 确认目标和引用；不能删除 start。
5. **改完必验**：写入后系统会自动校验并把结果回传给你；如果返回 ok:false 或 warnings，必须根据错误修正并重试。必要时调用 validateScript。
6. **不假装成功**：只有工具结果 ok:true 才算完成。失败的操作要在最终总结里明确说明，不要写成已完成。
7. **choiceIndex 口径**：选项在该场景出边中的顺序（从 0 开始），不是场景节点数组下标；用 getScene 查看。
8. **场景 ID 规则**：只能使用字母、数字、下划线、连字符，不能有空格；不能与已有场景重复。
9. **对话角色**：addDialogueLine 的 speaker 必须已在角色列表注册；未注册先用 addCharacter。
10. **收尾**：用一两句话总结成功和失败的操作，方便用户核对。

不要在最终回复里粘贴大段剧本或工具 JSON；只总结关键改动和需要用户注意的问题。`;

/**
 * 聊天请求体类型
 */
export interface ChatRequest {
  message: string;
  // 指定使用的 AI 提供者（须在用户许可列表内，否则回退用户默认）
  provider?: string;
  /** 指定模型 ID（仅付费用户有效，须与最终 provider 匹配；免费用户静默忽略） */
  model?: string;
  /** 参考图 R2 URL 列表（≤4，前端先上传再调用；后端校验归属） */
  images?: string[];
  context: {
    dsl: string;
    story?: string;
    characters?: Record<string, { name: string; description?: string }>;
    variables?: Record<string, unknown>;
  };
  history?: Array<{ role: 'user' | 'assistant'; content: string; images?: string[] }>;
  /** 本次用户消息已经执行的工具轮次（客户端回传，用于多轮工具调用） */
  toolRounds?: ChatToolRound[];
}

export interface ChatToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  /** Google Gemini thoughtSignature，其他 provider 忽略 */
  signature?: string;
}

export interface ChatToolResult {
  id: string;
  name: string;
  content: string;
  isError?: boolean;
}

export interface ChatToolRound {
  assistantText?: string;
  calls: ChatToolCall[];
  results: ChatToolResult[];
}

/** 聊天历史里的图片不进 system 首轮，只挂在产生它的那条 user 消息上 */
function toChatContent(text: string, images?: string[]): ChatMessage['content'] {
  if (!images || images.length === 0) return text;
  return [{ type: 'text', text }, ...images.map((url) => ({ type: 'image_url' as const, url }))];
}

/** 把工具轮次追加到消息序列，供 Provider 还原 assistant tool_calls + tool result */
export function appendToolRounds(messages: ChatMessage[], toolRounds?: ChatToolRound[]): ChatMessage[] {
  if (!toolRounds || toolRounds.length === 0) return messages;
  for (const round of toolRounds) {
    messages.push({
      role: 'model',
      content: round.assistantText ?? '',
      toolCalls: round.calls.map((call) => ({
        id: call.id,
        name: call.name,
        args: call.args,
        ...(call.signature ? { signature: call.signature } : {}),
      })),
    });
    for (const result of round.results) {
      messages.push({
        role: 'tool',
        content: result.content,
        toolCallId: result.id,
        name: result.name,
        ...(result.isError ? { isError: true } : {}),
      });
    }
  }
  return messages;
}

/**
 * 构建聊天历史记录。
 * `currentUserMessageWithContext` 每轮都使用最新 context 重建，保证模型看到的是编辑后的剧本。
 */
export function buildChatHistory(
  history: ChatRequest['history'],
  currentUserMessageWithContext: string,
  currentImages?: string[],
  toolRounds?: ChatToolRound[],
): ChatMessage[] {
  const messages: ChatMessage[] = [
    // 系统提示作为第一条用户消息
    { role: 'user', content: CHAT_SYSTEM_PROMPT },
    { role: 'model', content: '我明白了，我会先读取必要的上下文，再准确修改并校验剧本。请告诉我你想做什么？' },
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

  return appendToolRounds(messages, toolRounds);
}
