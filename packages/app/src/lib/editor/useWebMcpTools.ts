'use client';

/**
 * in-page WebMCP 注册 hook（W3C WebMCP 草案：document.modelContext.registerTool）。
 * - 调用方显式提供工具子集与执行函数，编辑器与播放页各自决定暴露面；
 * - 按规范用 AbortSignal 注销，兼容早期实现的 unregister/unregisterTool；
 * - 不支持的浏览器（无 modelContext）静默跳过，不阻塞页面。
 */
import { useEffect, useRef } from 'react';
import type { WebMcpTool } from '@mui-gamebook/webmcp';

interface WebMcpHost {
  tools: WebMcpTool[];
  execute: (name: string, args: Record<string, unknown>) => unknown | Promise<unknown>;
}

function getModelContext(): WebMcpModelContext | null {
  if (typeof document === 'undefined') return null;
  const documentContext = document.modelContext;
  if (documentContext?.registerTool) return documentContext;
  // 兼容只挂到 navigator 的 polyfill / 早期实现
  const navigatorContext = typeof navigator !== 'undefined' ? navigator.modelContext : undefined;
  return navigatorContext?.registerTool ? navigatorContext : null;
}

export function useWebMcpTools(host: WebMcpHost) {
  const hostRef = useRef(host);
  hostRef.current = host;

  useEffect(() => {
    const modelContext = getModelContext();
    if (!modelContext) return;

    const controller = new AbortController();
    const legacyCleanups: Array<() => void> = [];

    for (const tool of hostRef.current.tools) {
      let registration: unknown;
      try {
        registration = modelContext.registerTool(
          {
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema,
            ...(tool.annotations ? { annotations: tool.annotations } : {}),
            execute: async (args) => {
              try {
                return await hostRef.current.execute(tool.name, args ?? {});
              } catch (error) {
                return `执行失败：${(error as Error).message}`;
              }
            },
          },
          { signal: controller.signal },
        );
      } catch (error) {
        console.warn(`[WebMCP] 注册工具 ${tool.name} 失败:`, error);
        continue;
      }

      // 正常实现返回 Promise；早期实现可能返回带 unregister 的句柄
      if (registration && typeof (registration as Promise<unknown>).then === 'function') {
        void Promise.resolve(registration).catch((error: unknown) => {
          if (!controller.signal.aborted) {
            console.warn(`[WebMCP] 注册工具 ${tool.name} 失败:`, error);
          }
        });
      } else if (registration && typeof (registration as { unregister?: unknown }).unregister === 'function') {
        const handle = registration as { unregister: () => void };
        legacyCleanups.push(() => handle.unregister());
      }
    }

    return () => {
      controller.abort();
      for (const cleanup of legacyCleanups) {
        try {
          cleanup();
        } catch {
          // 忽略注销失败
        }
      }
      // 部分实现不响应 signal，补一次按名注销
      for (const tool of hostRef.current.tools) {
        try {
          modelContext.unregisterTool?.(tool.name);
        } catch {
          // 忽略注销失败
        }
      }
    };
  }, []);
}
