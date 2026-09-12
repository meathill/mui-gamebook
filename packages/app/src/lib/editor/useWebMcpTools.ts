'use client';

/**
 * in-page WebMCP 注册 hook（W3C WebMCP 草案：document.modelContext.registerTool）。
 * - editor 模式：注册全部工具，写操作经 onWriteCall 回到编辑器既有链路（含 undo）。
 * - readonly 模式：只注册 getDsl/listScenes，写调用直接返回拒绝文案。
 * - 不支持的浏览器（无 modelContext）静默跳过，不阻塞页面。
 */
import { useEffect, useRef } from 'react';
import { getReadonlyTools, WEBMCP_TOOLS } from '@mui-gamebook/webmcp';

interface WebMcpHost {
  mode: 'editor' | 'readonly';
  getDsl: () => string;
  listScenes: () => string;
  onWriteCall?: (name: string, args: Record<string, unknown>) => string;
}

interface ModelContextLike {
  registerTool: (tool: {
    name: string;
    description: string;
    inputSchema: unknown;
    execute: (args: Record<string, unknown>) => Promise<{ content: Array<{ type: string; text: string }> }>;
  }) => { unregister?: () => void } | void;
  unregisterTool?: (name: string) => void;
}

function getModelContext(): ModelContextLike | null {
  if (typeof document === 'undefined') return null;
  const mc = (document as unknown as { modelContext?: ModelContextLike }).modelContext;
  return mc?.registerTool ? mc : null;
}

function textResult(text: string) {
  return { content: [{ type: 'text', text }] };
}

export function useWebMcpTools(host: WebMcpHost) {
  const hostRef = useRef(host);
  hostRef.current = host;

  useEffect(() => {
    const mc = getModelContext();
    if (!mc) return;
    const mode = hostRef.current.mode;
    const tools = mode === 'editor' ? WEBMCP_TOOLS : getReadonlyTools();
    const cleanups: Array<() => void> = [];

    for (const tool of tools) {
      const handle = mc.registerTool({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        execute: async (args) => {
          const h = hostRef.current;
          try {
            if (tool.name === 'getDsl') return textResult(h.getDsl());
            if (tool.name === 'listScenes') return textResult(h.listScenes());
            if (h.mode !== 'editor' || !h.onWriteCall) return textResult(`只读页面不支持 ${tool.name}`);
            return textResult(h.onWriteCall(tool.name, args));
          } catch (e) {
            return textResult(`执行失败：${(e as Error).message}`);
          }
        },
      });
      if (handle && typeof (handle as { unregister?: unknown }).unregister === 'function') {
        cleanups.push(() => (handle as { unregister: () => void }).unregister());
      } else {
        cleanups.push(() => mc.unregisterTool?.(tool.name));
      }
    }

    return () => {
      for (const fn of cleanups) {
        try {
          fn();
        } catch {
          // 忽略注销失败
        }
      }
    };
  }, []);
}
