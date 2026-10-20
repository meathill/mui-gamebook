/**
 * 编辑器写工具清单（场景 / 选项 / 变量 / 角色）。
 * 播放页不注册这些工具；chatbot 与 in-page 编辑器 Agent 共用同一份定义。
 */
import type { WebMcpTool } from './tool-types';

export const WRITE_TOOLS: WebMcpTool[] = [
  {
    name: 'updateScene',
    description:
      '覆盖指定场景的完整文案（会替换原正文/对话，保留素材与选项）。仅在用户明确要求重写整个场景时使用；改文案优先 updateSceneText。',
    inputSchema: {
      type: 'object',
      properties: {
        sceneId: { type: 'string', description: '场景 ID（可用 listScenes 查看）' },
        content: { type: 'string', description: '新的场景内容（Markdown / DSL 文本）' },
      },
      required: ['sceneId', 'content'],
    },
    annotations: { consequentialHint: true },
  },
  {
    name: 'updateSceneText',
    description: '只更新场景的正文与对话，不影响素材和选项（推荐使用）。',
    inputSchema: {
      type: 'object',
      properties: {
        sceneId: { type: 'string', description: '场景 ID（可用 listScenes 查看）' },
        text: { type: 'string', description: '新的场景内容（Markdown / DSL 文本）' },
      },
      required: ['sceneId', 'text'],
    },
  },
  {
    name: 'updateSceneImagePrompt',
    description: '只更新场景的 AI 配图 prompt；没有 ai_image 素材时会自动创建。',
    inputSchema: {
      type: 'object',
      properties: {
        sceneId: { type: 'string', description: '场景 ID' },
        imagePrompt: { type: 'string', description: '新的图片生成 prompt' },
      },
      required: ['sceneId', 'imagePrompt'],
    },
  },
  {
    name: 'setSceneImage',
    description:
      '设置场景配图：可写生成结果 url，和/或 imagePrompt、角色立绘 character。至少提供 url 或 imagePrompt 之一。',
    inputSchema: {
      type: 'object',
      properties: {
        sceneId: { type: 'string', description: '场景 ID' },
        url: { type: 'string', description: '已生成图片 URL（generateImage 的返回值）' },
        imagePrompt: { type: 'string', description: '图片生成 prompt' },
        character: { type: 'string', description: '立绘角色 ID（可选）' },
      },
      required: ['sceneId'],
    },
  },
  {
    name: 'addScene',
    description: '添加新场景。场景 ID 只能使用字母、数字、下划线、连字符，不能有空格；不能与已有场景重复。',
    inputSchema: {
      type: 'object',
      properties: {
        sceneId: { type: 'string', description: '新场景的 ID' },
        content: { type: 'string', description: '场景内容（Markdown / DSL 文本）' },
        afterSceneId: { type: 'string', description: '在哪个场景之后添加（可选，仅影响画布位置）' },
      },
      required: ['sceneId', 'content'],
    },
  },
  {
    name: 'deleteScene',
    description: '删除场景，并自动清理所有指向它的选项与重定向。不能删除 start 场景。',
    inputSchema: {
      type: 'object',
      properties: {
        sceneId: { type: 'string', description: '要删除的场景 ID' },
      },
      required: ['sceneId'],
    },
    annotations: { consequentialHint: true },
  },
  {
    name: 'renameScene',
    description: '重命名场景，并同步更新所有选项与重定向的指向。不能与已有场景重名。',
    inputSchema: {
      type: 'object',
      properties: {
        oldId: { type: 'string', description: '原场景 ID' },
        newId: { type: 'string', description: '新场景 ID' },
      },
      required: ['oldId', 'newId'],
    },
    annotations: { consequentialHint: true },
  },
  {
    name: 'addDialogueLine',
    description:
      '向场景文案末尾追加一行角色对话（`@角色ID (表情): 台词`）。speaker 必须是已注册的角色 ID，未注册先用 addCharacter。',
    inputSchema: {
      type: 'object',
      properties: {
        sceneId: { type: 'string', description: '场景 ID' },
        speaker: { type: 'string', description: '说话角色的 ID（必须已在角色列表注册）' },
        content: { type: 'string', description: '台词内容' },
        emotion: { type: 'string', description: '表情/舞台指示（可选，如 angry、低声）' },
      },
      required: ['sceneId', 'speaker', 'content'],
    },
  },
  {
    name: 'addRedirect',
    description:
      '向场景末尾追加一条块级重定向 `-> 目标场景 (if: 条件)`。场景内多条重定向按序求值、首个条件命中者生效。',
    inputSchema: {
      type: 'object',
      properties: {
        sceneId: { type: 'string', description: '场景 ID' },
        targetSceneId: { type: 'string', description: '目标场景 ID（必须已存在）' },
        condition: { type: 'string', description: '条件表达式（可选，省略即无条件兜底）' },
        stateChange: { type: 'string', description: '状态变更表达式（可选）' },
      },
      required: ['sceneId', 'targetSceneId'],
    },
  },
  {
    name: 'addChoice',
    description: '为场景添加选项。choiceIndex 是场景出边顺序（从 0 开始）；新增选项会排在末尾。目标场景必须已存在。',
    inputSchema: {
      type: 'object',
      properties: {
        sceneId: { type: 'string', description: '源场景 ID' },
        text: { type: 'string', description: '选项文本' },
        targetSceneId: { type: 'string', description: '目标场景 ID' },
        condition: { type: 'string', description: '条件表达式（可选）' },
        stateChange: { type: 'string', description: '状态变更表达式（可选，如 gold = gold - 5）' },
      },
      required: ['sceneId', 'text', 'targetSceneId'],
    },
  },
  {
    name: 'updateChoice',
    description: '更新场景中某个选项的多个属性（慎用）。优先使用 updateChoiceText/Target/Condition。',
    inputSchema: {
      type: 'object',
      properties: {
        sceneId: { type: 'string', description: '源场景 ID' },
        choiceIndex: { type: 'integer', description: '选项在该场景出边中的顺序（从 0 开始）' },
        text: { type: 'string', description: '新的选项文本（可选）' },
        targetSceneId: { type: 'string', description: '新的目标场景 ID（可选）' },
        condition: { type: 'string', description: '新的条件表达式（可选）' },
        stateChange: { type: 'string', description: '新的状态变更表达式（可选）' },
      },
      required: ['sceneId', 'choiceIndex'],
    },
  },
  {
    name: 'updateChoiceText',
    description: '只更新选项文本，不影响其他属性（推荐使用）。',
    inputSchema: {
      type: 'object',
      properties: {
        sceneId: { type: 'string', description: '源场景 ID' },
        choiceIndex: { type: 'integer', description: '选项在该场景出边中的顺序（从 0 开始）' },
        text: { type: 'string', description: '新的选项文本' },
      },
      required: ['sceneId', 'choiceIndex', 'text'],
    },
  },
  {
    name: 'updateChoiceTarget',
    description: '只更新选项的目标场景，不影响其他属性（推荐使用）。',
    inputSchema: {
      type: 'object',
      properties: {
        sceneId: { type: 'string', description: '源场景 ID' },
        choiceIndex: { type: 'integer', description: '选项在该场景出边中的顺序（从 0 开始）' },
        targetSceneId: { type: 'string', description: '新的目标场景 ID（必须已存在）' },
      },
      required: ['sceneId', 'choiceIndex', 'targetSceneId'],
    },
  },
  {
    name: 'updateChoiceCondition',
    description: '只更新选项的条件表达式，不影响其他属性（推荐使用）。',
    inputSchema: {
      type: 'object',
      properties: {
        sceneId: { type: 'string', description: '源场景 ID' },
        choiceIndex: { type: 'integer', description: '选项在该场景出边中的顺序（从 0 开始）' },
        condition: { type: 'string', description: '新的条件表达式' },
      },
      required: ['sceneId', 'choiceIndex', 'condition'],
    },
  },
  {
    name: 'deleteChoice',
    description: '删除场景中的某个选项。',
    inputSchema: {
      type: 'object',
      properties: {
        sceneId: { type: 'string', description: '源场景 ID' },
        choiceIndex: { type: 'integer', description: '选项在该场景出边中的顺序（从 0 开始）' },
      },
      required: ['sceneId', 'choiceIndex'],
    },
    annotations: { consequentialHint: true },
  },
  {
    name: 'addVariable',
    description: '添加游戏变量；变量名不能与已有变量重复。value 按 true/false/数字/字符串解析。',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: '变量名' },
        value: { type: 'string', description: '初始值' },
        visible: { type: 'boolean', description: '是否在界面显示' },
        label: { type: 'string', description: '显示名称' },
      },
      required: ['name', 'value'],
    },
  },
  {
    name: 'updateVariable',
    description: '更新游戏变量的值或显示属性。',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: '变量名' },
        value: { type: 'string', description: '新的值（可选）' },
        visible: { type: 'boolean', description: '是否在界面显示（可选）' },
        label: { type: 'string', description: '显示名称（可选）' },
      },
      required: ['name'],
    },
  },
  {
    name: 'deleteVariable',
    description: '删除游戏变量；不会自动清理剧本中对它的引用，删除前先确认引用。',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: '变量名' },
      },
      required: ['name'],
    },
    annotations: { consequentialHint: true },
  },
  {
    name: 'addCharacter',
    description: '添加 AI 角色；角色 ID 会用于对话行 `@角色ID:`，不能与已有角色重复。',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: '角色 ID' },
        name: { type: 'string', description: '角色名称' },
        description: { type: 'string', description: '角色描述' },
        imagePrompt: { type: 'string', description: '图片生成提示词' },
      },
      required: ['id', 'name'],
    },
  },
  {
    name: 'updateCharacter',
    description: '更新 AI 角色的名称、描述、立绘 prompt 或立绘 URL。',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: '角色 ID' },
        name: { type: 'string', description: '新名称（可选）' },
        description: { type: 'string', description: '新描述（可选）' },
        imagePrompt: { type: 'string', description: '新图片生成提示词（可选）' },
        imageUrl: { type: 'string', description: '角色立绘/头像 URL（可选）' },
      },
      required: ['id'],
    },
  },
  {
    name: 'deleteCharacter',
    description: '删除 AI 角色；已有对话行会退化为普通文本，删除前先确认。',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: '角色 ID' },
      },
      required: ['id'],
    },
    annotations: { consequentialHint: true },
  },
];
