import type { WebMcpTool } from '@mui-gamebook/webmcp';

const gameId = { type: 'integer', description: '作品数据库 ID' };
const inputHash = { type: 'string', description: '服务端计算的生成输入 SHA-256' };
const assetId = { type: 'string', description: '素材清单中的稳定位置 ID' };

export const MEDIA_ASSISTANCE_TOOLS: WebMcpTool[] = [
  {
    name: 'claimMediaAssistanceWork',
    description:
      '仅管理员：领取或恢复唯一当前作品。先续作；再按作者主动开启、无图优先、访问量和更新时间排序。可传 gameId 只领取指定作品（仍校验发布、未屏蔽、作者未退出、剧本有效）。返回冻结输入、稳定目标和进度。',
    inputSchema: { type: 'object', properties: { gameId: { ...gameId, description: '可选：只领取该作品' } } },
  },
  {
    name: 'saveMediaAssistancePlan',
    description:
      '仅管理员：增量合并素材计划。未变项沿用原 prompt；不改正文、不覆盖已有素材、不恢复作者删除项。kind=image|video|speech|music|sfx。target: cover、character(characterId)、image/video/audio(sceneId)、speech(sceneId,textHash,occurrence，使用领取结果)。每批最多 200 项，未完成规划传 planningComplete=false；后续批次使用返回的 revision。',
    inputSchema: {
      type: 'object',
      properties: {
        gameId,
        revision: { type: 'integer' },
        planningComplete: {
          type: 'boolean',
          description: '默认 true。分批规划的非末批必须传 false，避免中断后漏掉剩余需求。',
        },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              target: {
                type: 'object',
                properties: {
                  kind: { type: 'string' },
                  characterId: { type: 'string' },
                  sceneId: { type: 'string' },
                  sceneKey: { type: 'string' },
                  textHash: { type: 'string' },
                  occurrence: { type: 'integer' },
                },
                required: ['kind'],
              },
              input: {
                type: 'object',
                properties: {
                  kind: { type: 'string', enum: ['image', 'video', 'speech', 'music', 'sfx'] },
                  prompt: { type: 'string' },
                  referenceHashes: { type: 'array', items: { type: 'string' } },
                  parameters: { type: 'object', additionalProperties: true },
                },
                required: ['kind', 'prompt'],
              },
            },
            required: ['target', 'input'],
          },
        },
      },
      required: ['gameId', 'revision', 'items'],
    },
  },
  {
    name: 'claimMediaAssistanceItem',
    description:
      '仅管理员：按 hash 原子领取。requestId 在本地持久化并在重试时复用。只有获得执行凭据且 status=generating 才可生成；ready 直接应用，uncertain 必须先核对外部任务和缓存。',
    inputSchema: {
      type: 'object',
      properties: { gameId, assetId, requestId: { type: 'string' } },
      required: ['gameId', 'assetId', 'requestId'],
    },
  },
  {
    name: 'updateMediaAssistanceItem',
    description:
      '仅管理员：checkpoint 保存外部任务标识并续期；pause 记录失败原因；resume 必须先核实无产物且无运行中任务，传 confirmedNoResult=true。执行期限 30 分钟，过期不自动重做。',
    inputSchema: {
      type: 'object',
      properties: {
        gameId,
        inputHash,
        action: { type: 'string', enum: ['checkpoint', 'pause', 'resume'] },
        executionToken: { type: 'string' },
        providerTaskId: { type: 'string' },
        reason: { type: 'string' },
        confirmedNoResult: { type: 'boolean' },
      },
      required: ['gameId', 'inputHash', 'action'],
    },
  },
  {
    name: 'applyMediaAssistanceAsset',
    description: '仅管理员：把已上传结果应用到目标；再次检查 hash、授权和版本，只填空，不覆盖。重复调用返回已有状态。',
    inputSchema: {
      type: 'object',
      properties: { gameId, assetId, inputHash },
      required: ['gameId', 'assetId', 'inputHash'],
    },
  },
  {
    name: 'finishMediaAssistanceWork',
    description: '仅管理员：核实本轮无可执行项后释放作品。暂停项只能算部分完成，之后可恢复。',
    inputSchema: { type: 'object', properties: { gameId }, required: ['gameId'] },
  },
];
