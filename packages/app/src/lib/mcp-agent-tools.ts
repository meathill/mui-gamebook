/**
 * MCP Agent 生命周期工具（仅后端 /api/mcp 暴露）。
 * 不进入 WEBMCP_TOOLS：chatbot / in-page 不应拿到建游戏、生图等管理能力。
 */
import type { WebMcpTool } from '@mui-gamebook/webmcp';

export const MCP_AGENT_TOOLS: WebMcpTool[] = [
  {
    name: 'listGames',
    description:
      '列出可管理的游戏（id/slug/title/published/updatedAt）。管理员 Bearer 可列全部，session 用户只列自己的。',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'integer', description: '最多返回条数，默认 50' },
      },
    },
    readonly: true,
  },
  {
    name: 'getGameInfo',
    description: '读取游戏元信息与场景概览（不含完整 DSL 正文；全文用 getDsl）',
    inputSchema: {
      type: 'object',
      properties: {
        gameId: { type: 'integer', description: '游戏 ID' },
      },
      required: ['gameId'],
    },
    readonly: true,
  },
  {
    name: 'createGame',
    description: '创建空白游戏（或带初始 DSL）。返回 id/slug。',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: '游戏标题' },
        content: { type: 'string', description: '初始 DSL（可选；省略则用默认模板）' },
        description: { type: 'string', description: '简介（可选）' },
        ownerId: { type: 'string', description: '所有者用户 ID（可选；管理员 Bearer 可指定，否则落到 root/首个用户）' },
      },
      required: ['title'],
    },
  },
  {
    name: 'updateGameMeta',
    description: '更新游戏元数据：标题/简介/背景故事/标签/封面/发布状态',
    inputSchema: {
      type: 'object',
      properties: {
        gameId: { type: 'integer', description: '游戏 ID' },
        title: { type: 'string' },
        description: { type: 'string' },
        backgroundStory: { type: 'string' },
        coverImage: { type: 'string', description: '封面图 URL' },
        tags: { type: 'array', items: { type: 'string' }, description: '标签列表' },
        published: { type: 'boolean', description: '是否发布' },
      },
      required: ['gameId'],
    },
  },
  {
    name: 'setGameDsl',
    description: '整篇替换剧本 DSL（先 parse 校验再落库）。改局部请优先用 updateSceneText 等细粒度工具。',
    inputSchema: {
      type: 'object',
      properties: {
        gameId: { type: 'integer', description: '游戏 ID' },
        content: { type: 'string', description: '完整 DSL（Markdown + frontmatter）' },
        dryRun: { type: 'boolean', description: 'true 则只校验不落库' },
      },
      required: ['gameId', 'content'],
    },
  },
  {
    name: 'generateScript',
    description: '用 AI 把故事大纲生成/修订为完整剧本 DSL。会调用文本模型（计费）；建议 dryRun 先预览。',
    inputSchema: {
      type: 'object',
      properties: {
        gameId: { type: 'integer', description: '游戏 ID' },
        story: { type: 'string', description: '故事大纲或修改指令' },
        dryRun: { type: 'boolean', description: 'true 则只返回生成结果不写库' },
        useExisting: { type: 'boolean', description: 'true 时在现有剧本上修订；false/省略且剧本为空则从零生成' },
        provider: {
          type: 'string',
          description: '可选文本提供者（mimo/opencode/google/openai/anthropic），默认用户许可内默认项',
        },
      },
      required: ['gameId', 'story'],
    },
  },
  {
    name: 'generateImage',
    description:
      'AI 生成场景/角色图并上传，返回图片 URL（不自动改 DSL；可用 setSceneImage/updateCharacter imageUrl 或 setGameDsl 接入）。',
    inputSchema: {
      type: 'object',
      properties: {
        gameId: { type: 'integer', description: '游戏 ID（用于路径与计费归属）' },
        prompt: { type: 'string', description: '生图 prompt' },
        aspectRatio: { type: 'string', description: '可选宽高比，如 16:9' },
      },
      required: ['gameId', 'prompt'],
    },
  },
  {
    name: 'uploadAsset',
    description:
      '上传图/音/视频素材到 R2 并返回公网 URL。data 支持 base64 或 data URL；type=cover|character|scene|chat|audio|video。之后用 setSceneImage/updateCharacter/setGameDsl 挂进 DSL。',
    inputSchema: {
      type: 'object',
      properties: {
        gameId: { type: 'integer', description: '游戏 ID（权限与路径）' },
        data: { type: 'string', description: 'base64 或 data:...;base64,...' },
        contentType: { type: 'string', description: 'MIME，如 image/png；data URL 可省略' },
        fileName: { type: 'string', description: '原始文件名（取扩展名，可选）' },
        type: { type: 'string', description: 'cover|character|scene|chat|audio|video，默认 scene' },
        characterId: { type: 'string', description: 'type=character 时的角色 ID' },
      },
      required: ['gameId', 'data'],
    },
  },
  {
    name: 'deleteGame',
    description: '删除游戏（含剧本内容，不可恢复）。需 confirm: true。',
    inputSchema: {
      type: 'object',
      properties: {
        gameId: { type: 'integer', description: '游戏 ID' },
        confirm: { type: 'boolean', description: '必须为 true 才执行删除' },
      },
      required: ['gameId', 'confirm'],
    },
  },
];

export function getMcpToolsForList(): WebMcpTool[] {
  // 动态 import 会拖慢 Worker 冷启动；由 route 合并 WEBMCP_TOOLS
  return MCP_AGENT_TOOLS;
}
