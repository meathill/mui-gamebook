/**
 * AI Prompt 生成模块
 * 为缺少图片的场景自动生成 ai_image 节点和 prompt
 */
import type { Game, Scene, SceneNode } from '@mui-gamebook/parser';
import type { FunctionDeclaration } from '@mui-gamebook/core/lib/ai-provider';
import { getAiProvider } from './config';

/**
 * 场景图片信息
 */
export interface SceneImageInfo {
  sceneId: string;
  hasImage: boolean;
  textContent: string; // 场景的文本内容，用于 AI 理解上下文
}

/**
 * AI 生成的图片 prompt 结果
 */
export interface GeneratedPrompt {
  sceneId: string;
  imagePrompt: string;
}

/**
 * 分析场景，找出缺少图片的场景
 */
export function findScenesWithoutImages(game: Game): SceneImageInfo[] {
  const result: SceneImageInfo[] = [];

  for (const scene of Object.values(game.scenes)) {
    const hasImage = scene.nodes.some(
      (node: SceneNode) => node.type === 'ai_image' || node.type === 'static_image',
    );

    // 收集场景的文本内容
    const textContent = scene.nodes
      .filter((node: SceneNode) => node.type === 'text')
      .map((node: SceneNode) => (node as { content: string }).content)
      .join('\n');

    result.push({
      sceneId: scene.id,
      hasImage,
      textContent,
    });
  }

  return result;
}

/**
 * 构建 AI 上下文
 * 类似线上 AI 编辑助手的上下文构建
 */
export function buildAIContext(game: Game, scenesWithoutImages: SceneImageInfo[]): string {
  const parts: string[] = [];

  // 1. 游戏基本信息
  parts.push(`## 游戏信息\n\n- 标题: ${game.title}\n- Slug: ${game.slug || 'N/A'}`);

  // 2. AI 风格配置
  if (game.ai?.style?.image) {
    parts.push(`## 图片风格\n\n${game.ai.style.image}`);
  }

  // 3. 角色定义
  if (game.ai?.characters && Object.keys(game.ai.characters).length > 0) {
    const charList = Object.entries(game.ai.characters)
      .map(([charId, char]) => {
        const desc = char.image_prompt || char.description || '';
        return `- ${charId}: ${char.name}${desc ? ` - ${desc}` : ''}`;
      })
      .join('\n');
    parts.push(`## 角色定义\n\n${charList}`);
  }

  // 4. 需要生成图片的场景列表
  const sceneList = scenesWithoutImages
    .filter((s) => !s.hasImage)
    .map((s) => {
      const preview = s.textContent.substring(0, 200).replace(/\n/g, ' ');
      return `### 场景: ${s.sceneId}\n\n${preview}${s.textContent.length > 200 ? '...' : ''}`;
    })
    .join('\n\n');

  parts.push(`## 需要生成图片 Prompt 的场景\n\n${sceneList}`);

  return parts.join('\n\n');
}

/**
 * 用于生成图片 prompt 的 AI 系统提示
 */
const SYSTEM_PROMPT = `你是一个互动小说的图片 prompt 生成专家。

用户会提供游戏的背景信息、图片风格、角色定义，以及需要生成图片的场景列表。

你的任务是为每个场景生成适合的图片生成 prompt。

生成规则：
1. 每个 prompt 应该简洁但描述性强，适合 AI 图片生成
2. 结合游戏的整体图片风格
3. 如果场景涉及角色，使用 @角色ID 的格式引用角色
4. 重点描述场景的视觉元素：环境、氛围、光线、构图等
5. 不要描述抽象概念，只描述可视化的内容

输出格式：
请为每个场景调用 updateSceneImagePrompt 函数来设置图片 prompt。`;

/**
 * 用于生成图片 prompt 的函数声明
 */
const PROMPT_FUNCTION_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: 'updateSceneImagePrompt',
    description: '为场景设置图片生成 prompt',
    parameters: {
      type: 'object',
      properties: {
        sceneId: { type: 'string', description: '场景 ID' },
        imagePrompt: { type: 'string', description: '图片生成 prompt' },
      },
      required: ['sceneId', 'imagePrompt'],
    },
  },
];

/**
 * 调用 AI 生成图片 prompts
 */
export async function generateImagePrompts(
  game: Game,
  scenesWithoutImages: SceneImageInfo[],
): Promise<GeneratedPrompt[]> {
  const provider = getAiProvider();

  if (!provider.chatWithTools) {
    throw new Error('当前 AI 提供者不支持 function calling');
  }

  const context = buildAIContext(game, scenesWithoutImages);

  const userMessage = `请为以下场景生成图片 prompt：\n\n${context}`;

  const messages = [
    { role: 'user' as const, content: SYSTEM_PROMPT },
    { role: 'model' as const, content: '明白，我会为每个场景生成适合的图片 prompt。' },
    { role: 'user' as const, content: userMessage },
  ];

  console.log('[AI] 调用 AI 生成图片 prompts...');

  const response = await provider.chatWithTools(messages, PROMPT_FUNCTION_DECLARATIONS);

  const results: GeneratedPrompt[] = [];

  if (response.functionCalls && response.functionCalls.length > 0) {
    for (const fc of response.functionCalls) {
      if (fc.name === 'updateSceneImagePrompt') {
        const args = fc.args as { sceneId: string; imagePrompt: string };
        results.push({
          sceneId: args.sceneId,
          imagePrompt: args.imagePrompt,
        });
        console.log(`  ✓ ${args.sceneId}: ${args.imagePrompt.substring(0, 60)}...`);
      }
    }
  }

  return results;
}

/**
 * 将生成的 prompts 插入剧本中的 ai_image 节点
 */
export function insertImageNodes(game: Game, prompts: GeneratedPrompt[]): Game {
  // 深拷贝以避免修改原对象
  const updatedGame = JSON.parse(JSON.stringify(game)) as Game;

  for (const prompt of prompts) {
    const scene = updatedGame.scenes[prompt.sceneId] as Scene | undefined;
    if (!scene) {
      console.warn(`[警告] 场景不存在: ${prompt.sceneId}`);
      continue;
    }

    // 检查是否已有图片节点
    const hasImage = scene.nodes.some(
      (node: SceneNode) => node.type === 'ai_image' || node.type === 'static_image',
    );

    if (hasImage) {
      console.log(`[跳过] 场景 ${prompt.sceneId} 已有图片节点`);
      continue;
    }

    // 在场景开头插入 ai_image 节点
    const imageNode: SceneNode = {
      type: 'ai_image',
      prompt: prompt.imagePrompt,
    };

    scene.nodes.unshift(imageNode);
    console.log(`[插入] 场景 ${prompt.sceneId} 添加了 ai_image 节点`);
  }

  return updatedGame;
}
