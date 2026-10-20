/** chatbot 会话共享类型 */

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  images?: string[];
  functionCalls?: FunctionCall[];
  toolResults?: ToolExecutionResult[];
  /** tool-round 是中间执行消息，不进入下一轮 history */
  kind?: 'text' | 'tool-round';
}

export interface FunctionCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  signature?: string;
}

export interface ToolExecutionResult {
  name: string;
  ok: boolean;
  message: string;
  warnings?: string[];
}

export type ChatStatus = 'thinking' | 'executing' | null;

export interface ChatContext {
  dsl: string;
  story?: string;
  characters?: Record<string, { name: string; description?: string }>;
  variables?: Record<string, unknown>;
}
