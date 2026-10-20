/**
 * WebMCP 工具定义的唯一源。
 * chatbot 的 CHAT_FUNCTION_DECLARATIONS 复用这份清单，保证两端语义一致。
 */
import { PLAYBACK_TOOL_NAMES, READ_TOOLS } from './read-tools';
import type { WebMcpTool } from './tool-types';
import { WRITE_TOOLS } from './write-tools';

export type { WebMcpTool, WebMcpToolAnnotations, WebMcpToolInputSchema } from './tool-types';

export const WEBMCP_TOOLS: WebMcpTool[] = [...WRITE_TOOLS, ...READ_TOOLS];

/** 操作优先级：添加 > 删除 > 更新（只读工具最先执行） */
export const WEBMCP_OPERATION_PRIORITY: Record<string, number> = {
  getDsl: 0,
  listScenes: 0,
  getScene: 0,
  searchScenes: 0,
  validateScript: 0,
  addScene: 1,
  addChoice: 1,
  addVariable: 1,
  addCharacter: 1,
  deleteScene: 2,
  deleteChoice: 2,
  deleteVariable: 2,
  deleteCharacter: 2,
  updateScene: 3,
  updateSceneText: 3,
  updateSceneImagePrompt: 3,
  setSceneImage: 3,
  renameScene: 3,
  updateChoice: 3,
  updateChoiceText: 3,
  updateChoiceTarget: 3,
  updateChoiceCondition: 3,
  updateVariable: 3,
  updateCharacter: 3,
  addDialogueLine: 3,
  addRedirect: 3,
};

export function sortWebMcpCalls<T extends { name: string }>(calls: T[]): T[] {
  return [...calls].sort(
    (a, b) => (WEBMCP_OPERATION_PRIORITY[a.name] ?? 99) - (WEBMCP_OPERATION_PRIORITY[b.name] ?? 99),
  );
}

export function getWritableTools(): WebMcpTool[] {
  return WEBMCP_TOOLS.filter((t) => !t.readonly);
}

export function getReadonlyTools(): WebMcpTool[] {
  return WEBMCP_TOOLS.filter((t) => t.readonly);
}

/** 播放页只读子集：getDsl / listScenes */
export function getPlaybackTools(): WebMcpTool[] {
  const names = new Set<string>(PLAYBACK_TOOL_NAMES);
  return WEBMCP_TOOLS.filter((t) => t.readonly && names.has(t.name));
}
