/**
 * W3C WebMCP 草案的浏览器 API 类型声明（2026-10 draft）。
 * 仅声明本项目用到的子集，避免为了几个字段引入额外类型包。
 */
export {};

declare global {
  interface WebMcpBrowserToolAnnotations {
    readOnlyHint?: boolean;
    untrustedContentHint?: boolean;
    consequentialHint?: boolean;
    debugging?: boolean;
  }

  interface WebMcpBrowserTool {
    name: string;
    title?: string;
    description: string;
    inputSchema?: unknown;
    annotations?: WebMcpBrowserToolAnnotations;
    execute: (input: Record<string, unknown>, options: { signal: AbortSignal }) => Promise<unknown> | unknown;
  }

  interface WebMcpModelContext {
    registerTool: (tool: WebMcpBrowserTool, options?: { signal?: AbortSignal }) => unknown;
    getTools?: (options?: { fromOrigins?: string[] }) => Promise<Array<{ name: string }>>;
    /** 少数早期实现提供；标准实现通过 AbortSignal 注销 */
    unregisterTool?: (name: string) => void;
  }

  interface Document {
    modelContext?: WebMcpModelContext;
  }

  interface Navigator {
    modelContext?: WebMcpModelContext;
  }
}
