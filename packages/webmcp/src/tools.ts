/**
 * WebMCP 工具定义的唯一源。
 * chatbot 的 CHAT_FUNCTION_DECLARATIONS 反向复用这份清单，保证两端语义一致。
 * inputSchema 遵循 MCP tools/list 形态（JSON Schema subset），同时兼容现有 FunctionDeclaration。
 */

export interface WebMcpToolInputSchema {
  type: 'object';
  properties: Record<string, unknown>;
  required?: string[];
}

export interface WebMcpTool {
  name: string;
  description: string;
  inputSchema: WebMcpToolInputSchema;
  /** 只读工具可安全挂载到播放页；写工具仅编辑器页 + 后端 MCP（需鉴权） */
  readonly?: boolean;
}

export const WEBMCP_TOOLS: WebMcpTool[] = [
  {
    name: 'updateScene',
    description: '更新指定场景的完整内容（慎用，会覆盖整个场景）',
    inputSchema: {
      type: 'object',
      properties: {
        sceneId: { type: 'string', description: '场景 ID' },
        content: { type: 'string', description: '新的场景内容（Markdown 格式）' },
      },
      required: ['sceneId', 'content'],
    },
  },
  {
    name: 'updateSceneText',
    description: '只更新场景的文案内容，不影响其他属性（推荐使用）',
    inputSchema: {
      type: 'object',
      properties: {
        sceneId: { type: 'string', description: '场景 ID' },
        text: { type: 'string', description: '新的文案内容（Markdown 格式）' },
      },
      required: ['sceneId', 'text'],
    },
  },
  {
    name: 'updateSceneImagePrompt',
    description: '只更新场景的图片生成 prompt，不影响其他属性（推荐使用）',
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
    name: 'addScene',
    description: '添加新场景',
    inputSchema: {
      type: 'object',
      properties: {
        sceneId: { type: 'string', description: '新场景的 ID' },
        content: { type: 'string', description: '场景内容（Markdown 格式）' },
        afterSceneId: { type: 'string', description: '在哪个场景之后添加（可选，仅影响返回的场景顺序提示）' },
      },
      required: ['sceneId', 'content'],
    },
  },
  {
    name: 'deleteScene',
    description: '删除场景（完成后自动清理指向它的选项与重定向）',
    inputSchema: {
      type: 'object',
      properties: {
        sceneId: { type: 'string', description: '要删除的场景 ID' },
      },
      required: ['sceneId'],
    },
  },
  {
    name: 'renameScene',
    description: '重命名场景（同步更新所有选项与重定向的指向）',
    inputSchema: {
      type: 'object',
      properties: {
        oldId: { type: 'string', description: '原场景 ID' },
        newId: { type: 'string', description: '新场景 ID' },
      },
      required: ['oldId', 'newId'],
    },
  },
  {
    name: 'addDialogueLine',
    description: '向场景文案末尾追加一行角色对话（`@角色ID: 台词`）。speaker 必须是已注册的角色 ID',
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
    description: '向场景末尾追加一条块级重定向 `-> 目标场景 (if: 条件)`。场景内多条重定向按序求值、首个条件命中者生效',
    inputSchema: {
      type: 'object',
      properties: {
        sceneId: { type: 'string', description: '场景 ID' },
        targetSceneId: { type: 'string', description: '目标场景 ID' },
        condition: { type: 'string', description: '条件表达式（可选，省略即无条件兜底）' },
        stateChange: { type: 'string', description: '状态变更表达式（可选）' },
      },
      required: ['sceneId', 'targetSceneId'],
    },
  },
  {
    name: 'addChoice',
    description: '为场景添加选项',
    inputSchema: {
      type: 'object',
      properties: {
        sceneId: { type: 'string', description: '场景 ID' },
        text: { type: 'string', description: '选项文本' },
        targetSceneId: { type: 'string', description: '目标场景 ID' },
        condition: { type: 'string', description: '条件表达式（可选）' },
        stateChange: { type: 'string', description: '状态变更表达式（可选）' },
      },
      required: ['sceneId', 'text', 'targetSceneId'],
    },
  },
  {
    name: 'updateChoice',
    description: '更新场景中选项的多个属性（慎用）',
    inputSchema: {
      type: 'object',
      properties: {
        sceneId: { type: 'string', description: '场景 ID' },
        choiceIndex: { type: 'integer', description: '选项索引（从 0 开始）' },
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
    description: '只更新选项文本，不影响其他属性（推荐使用）',
    inputSchema: {
      type: 'object',
      properties: {
        sceneId: { type: 'string', description: '场景 ID' },
        choiceIndex: { type: 'integer', description: '选项索引（从 0 开始）' },
        text: { type: 'string', description: '新的选项文本' },
      },
      required: ['sceneId', 'choiceIndex', 'text'],
    },
  },
  {
    name: 'updateChoiceTarget',
    description: '只更新选项的目标场景，不影响其他属性（推荐使用）',
    inputSchema: {
      type: 'object',
      properties: {
        sceneId: { type: 'string', description: '场景 ID' },
        choiceIndex: { type: 'integer', description: '新的目标场景 ID' },
      },
      required: ['sceneId', 'choiceIndex', 'targetSceneId'],
    },
  },
  {
    name: 'updateChoiceCondition',
    description: '只更新选项的条件表达式，不影响其他属性（推荐使用）',
    inputSchema: {
      type: 'object',
      properties: {
        sceneId: { type: 'string', description: '场景 ID' },
        choiceIndex: { type: 'integer', description: '选项索引（从 0 开始）' },
        condition: { type: 'string', description: '新的条件表达式' },
      },
      required: ['sceneId', 'choiceIndex', 'condition'],
    },
  },
  {
    name: 'deleteChoice',
    description: '删除场景中的选项',
    inputSchema: {
      type: 'object',
      properties: {
        sceneId: { type: 'string', description: '场景 ID' },
        choiceIndex: { type: 'integer', description: '选项索引（从 0 开始）' },
      },
      required: ['sceneId', 'choiceIndex'],
    },
  },
  {
    name: 'addVariable',
    description: '添加游戏变量',
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
    description: '更新游戏变量',
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
    description: '删除游戏变量',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: '变量名' },
      },
      required: ['name'],
    },
  },
  {
    name: 'addCharacter',
    description: '添加 AI 角色',
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
    description: '更新 AI 角色',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: '角色 ID' },
        name: { type: 'string', description: '新名称（可选）' },
        description: { type: 'string', description: '新描述（可选）' },
        imagePrompt: { type: 'string', description: '新图片生成提示词（可选）' },
      },
      required: ['id'],
    },
  },
  {
    name: 'deleteCharacter',
    description: '删除 AI 角色',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: '角色 ID' },
      },
      required: ['id'],
    },
  },
  {
    name: 'getDsl',
    description: '读取当前剧本 DSL 全文（只读，播放页也可调用）',
    inputSchema: { type: 'object', properties: {} },
    readonly: true,
  },
  {
    name: 'listScenes',
    description: '列出所有场景 ID 与节点数（只读，播放页也可调用）',
    inputSchema: { type: 'object', properties: {} },
    readonly: true,
  },
];

/** 操作优先级：添加 > 删除 > 更新（与 chatbot 批量语义一致） */
export const WEBMCP_OPERATION_PRIORITY: Record<string, number> = {
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
  renameScene: 3,
  updateChoice: 3,
  updateChoiceText: 3,
  updateChoiceTarget: 3,
  updateChoiceCondition: 3,
  updateVariable: 3,
  updateCharacter: 3,
  addDialogueLine: 3,
  addRedirect: 3,
  getDsl: 0,
  listScenes: 0,
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
