/**
 * WebMCP 工具的类型定义。
 * inputSchema 遵循 MCP tools/list 形态（JSON Schema subset），同时兼容现有 FunctionDeclaration。
 */

export interface WebMcpToolInputSchema {
  type: 'object';
  properties: Record<string, unknown>;
  required?: string[];
}

/**
 * WebMCP 工具注解（W3C WebMCP ToolAnnotations 子集）。
 * 浏览器 Agent 可据此决定是否需要额外确认；chatbot function calling 会忽略这些字段。
 */
export interface WebMcpToolAnnotations {
  readOnlyHint?: boolean;
  consequentialHint?: boolean;
  untrustedContentHint?: boolean;
}

export interface WebMcpTool {
  name: string;
  description: string;
  inputSchema: WebMcpToolInputSchema;
  /** 只读工具可安全挂载到播放页；写工具仅编辑器页 + 后端 MCP（需鉴权） */
  readonly?: boolean;
  annotations?: WebMcpToolAnnotations;
}
