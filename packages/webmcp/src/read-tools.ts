/**
 * 只读工具清单：编辑器 in-page Agent、chatbot 与后端 MCP 共用。
 * 播放页只注册 PLAYBACK_TOOL_NAMES 中显式列出的工具。
 */
import type { WebMcpTool } from './tool-types';

export const READ_TOOLS: WebMcpTool[] = [
  {
    name: 'getDsl',
    description:
      '读取当前剧本 DSL 全文。对话上下文通常已包含当前剧本，仅在需要确认最新全文时调用；局部确认优先 getScene/searchScenes。',
    inputSchema: { type: 'object', properties: {} },
    readonly: true,
    annotations: { readOnlyHint: true, untrustedContentHint: true },
  },
  {
    name: 'listScenes',
    description: '列出所有场景 ID、节点数和选项数。修改前用它确认场景 ID，禁止臆造场景 ID。',
    inputSchema: { type: 'object', properties: {} },
    readonly: true,
    annotations: { readOnlyHint: true, untrustedContentHint: true },
  },
  {
    name: 'getScene',
    description:
      '读取场景完整信息：正文/对话、素材、出边选项（含 choiceIndex、条件、目标）、重定向和入边引用。修改场景或选项前必须先用它确认。',
    inputSchema: {
      type: 'object',
      properties: {
        sceneId: { type: 'string', description: '场景 ID（可用 listScenes 查看）' },
      },
      required: ['sceneId'],
    },
    readonly: true,
    annotations: { readOnlyHint: true, untrustedContentHint: true },
  },
  {
    name: 'searchScenes',
    description: '按关键词搜索场景 ID、正文、对话和选项文本，返回匹配片段。适合在长剧本中定位相关内容。',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '搜索关键词（不区分大小写）' },
        limit: { type: 'integer', description: '最多返回条数（可选，默认 20，最大 50）' },
      },
      required: ['query'],
    },
    readonly: true,
    annotations: { readOnlyHint: true, untrustedContentHint: true },
  },
  {
    name: 'validateScript',
    description:
      '校验当前剧本：DSL 语法、start 场景、悬空选项/重定向引用、空选项文本、未注册角色的对话行等。写入后建议调用。',
    inputSchema: { type: 'object', properties: {} },
    readonly: true,
    annotations: { readOnlyHint: true, untrustedContentHint: true },
  },
];

/** 播放页只读暴露：只保留作品摘要，不暴露编辑器需要的场景细节工具 */
export const PLAYBACK_TOOL_NAMES = ['getDsl', 'listScenes'] as const;
