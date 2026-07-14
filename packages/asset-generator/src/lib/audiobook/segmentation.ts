/**
 * 有声书文本分段
 * 判断一段场景正文里，哪些部分是旁白、哪些部分是哪个角色的对白
 *
 * 正文里"谁在说话"没有任何结构化字段（对白靠引号+归属短语混在叙述里），
 * 只能靠 LLM 阅读理解来判断，不是字符串匹配问题——尤其是角色互相假扮/
 * 冒充身份说话的场景（例如反派冒充另一个角色），必须结合上下文才能判断
 * 真正的说话人，见 manifest-generator.ts 里维护的滚动上下文缓冲区。
 */
import type { ChatMessage, FunctionDeclaration } from '@mui-gamebook/core/lib/ai-provider';
import type { Game } from '@mui-gamebook/parser';
import { getAiProvider } from '../config';
import { addUsage } from '../usage';
import { generateCacheFileName, cacheExists, readCache, writeCache } from '../cache';
import { NARRATOR_SPEAKER_ID, type RawSegment, type SegmentationContext } from './types';

/** 含有引号类字符（中英文引号、CJK 直角引号）才需要送 LLM 分段，否则整段直接判定为旁白 */
const QUOTE_PATTERN = /["“”'‘’「」『』]/;

/** 单节点分段数量上限，超过说明模型把文本拆得过碎，判定为无效结果 */
const MAX_SEGMENTS_PER_NODE = 30;

const FUNCTION_NAME = 'submitSegments';

const SYSTEM_PROMPT = `你是一个互动小说的语音分段专家。任务：把一段场景正文拆成有序的朗读片段，每个片段标注真正的朗读者。

关键规则：
1. 按"实际在场、实际说话"的人判断，而不是按文中用来称呼这个人的名字判断。如果一个角色在
   假扮、冒充、被误认成另一个角色（例如反派冒充某人的身份或声音在说话），必须把台词归给
   "实际说话"的那个角色 ID，忽略文中用来称呼 TA 的名字或引号里的自称。
2. 每个片段必须是原文的逐字摘录：不得改写、翻译、总结、增删文字或标点（包括引号）。
3. 所有片段按原文顺序排列、首尾相接后必须精确拼出原文；不得重排，不得合并不相邻的片段，
   不得省略任何字符。
4. 引导语（"她说""大灰狼回答道"之类）单独作为 narrator 片段，不并入角色台词，也不并入
   相邻角色的片段。
5. 如果整段话没有任何角色对白，返回恰好一个 speaker 为 "narrator"、text 为原文全文的片段。
6. 不要发明角色列表之外的 ID；无法判断具体是谁说的台词，一律归为 "narrator"。

请调用 ${FUNCTION_NAME} 函数返回结果。`;

function buildFunctionDeclaration(rosterIds: string[]): FunctionDeclaration {
  return {
    name: FUNCTION_NAME,
    description: '提交文本节点的分段结果，每个分段标注真正的朗读者',
    parameters: {
      type: 'object',
      properties: {
        segments: {
          type: 'array',
          description: '按原文顺序排列的分段列表，全部拼接后必须与原文逐字符相同',
          items: {
            type: 'object',
            properties: {
              speaker: {
                type: 'string',
                enum: [NARRATOR_SPEAKER_ID, ...rosterIds],
                description: `朗读者：旁白/场景描述用 "${NARRATOR_SPEAKER_ID}"；角色台词用角色 ID（${
                  rosterIds.join(', ') || '无其它角色'
                }）`,
              },
              text: {
                type: 'string',
                description: '该分段原文的逐字摘录，禁止改写、翻译、增删文字或标点',
              },
            },
            required: ['speaker', 'text'],
          },
        },
      },
      required: ['segments'],
    },
  };
}

function buildRosterDescription(game: Game): string {
  const characters = game.ai?.characters;
  if (!characters || Object.keys(characters).length === 0) {
    return '（无角色定义，全部按旁白处理）';
  }
  return Object.entries(characters)
    .map(([id, char]) => {
      const desc = char.description || char.image_prompt || '';
      return `- ${id}: ${char.name}${desc ? ` - ${desc}` : ''}`;
    })
    .join('\n');
}

function buildUserMessage(context: SegmentationContext, content: string): string {
  const precedingSection = context.precedingExcerpt
    ? `## 前文摘要（仅供参考；剧情有分支，这段前文不一定是通往当前节点的实际路径）\n${context.precedingExcerpt}\n\n`
    : '';
  return `## 角色列表\n${buildRosterDescription(context.game)}\n\n${precedingSection}## 待分段正文（场景: ${
    context.sceneId
  }，节点 #${context.nodeIndex}）\n${content}`;
}

/**
 * 校验并规范化 LLM 返回的分段结果
 * 任意一项不满足就返回 null，调用方应退化为单一 narrator 分段
 */
export function validateSegments(raw: unknown, rosterIds: string[], originalText: string): RawSegment[] | null {
  if (!raw || typeof raw !== 'object' || !('segments' in raw)) return null;

  let segments = (raw as { segments: unknown }).segments;

  // 实测 MiMo（mimo-v2.5-pro）偶尔会把 segments 数组整个序列化成字符串返回，
  // 而不是按 function-call schema 给出真正的嵌套数组，这里做一次防御性解析
  if (typeof segments === 'string') {
    try {
      segments = JSON.parse(segments);
    } catch {
      return null;
    }
  }

  if (!Array.isArray(segments) || segments.length === 0 || segments.length > MAX_SEGMENTS_PER_NODE) return null;

  const validSpeakers = new Set([NARRATOR_SPEAKER_ID, ...rosterIds]);
  const normalized: RawSegment[] = [];

  for (const item of segments) {
    if (
      !item ||
      typeof item !== 'object' ||
      typeof (item as { speaker?: unknown }).speaker !== 'string' ||
      typeof (item as { text?: unknown }).text !== 'string'
    ) {
      return null;
    }
    const speaker = (item as { speaker: string }).speaker;
    const text = (item as { text: string }).text;
    if (!text || !validSpeakers.has(speaker)) return null;
    normalized.push({ speaker, text });
  }

  const stripWhitespace = (value: string) => value.replace(/\s+/g, '');
  const reconstructed = normalized.map((segment) => segment.text).join('');
  if (stripWhitespace(reconstructed) !== stripWhitespace(originalText)) return null;

  return normalized;
}

/**
 * 把一段场景正文分段成 { speaker, text } 的有序列表
 *
 * 没有引号类字符时直接判定整段是旁白，不调用 LLM；LLM 结果不合法（或调用失败）时
 * 同样退化为单一旁白分段，不会让整个节点失败。分段结果按内容哈希缓存，与音频生成
 * 缓存相互独立——不合法的结果不写入缓存，下次非 --force 运行时还会重新尝试。
 */
export async function segmentText(content: string, context: SegmentationContext): Promise<RawSegment[]> {
  const fallback: RawSegment[] = [{ speaker: NARRATOR_SPEAKER_ID, text: content }];

  if (!QUOTE_PATTERN.test(content)) {
    return fallback;
  }

  const gameSlug = context.game.slug;
  const rosterIds = Object.keys(context.game.ai?.characters || {});
  const cacheFileName = generateCacheFileName(context.sceneId, context.nodeIndex, 'segments', content, 'json');

  if (cacheExists(gameSlug, cacheFileName)) {
    const cached = readCache(gameSlug, cacheFileName);
    if (cached) {
      try {
        const validated = validateSegments(JSON.parse(cached.toString('utf-8')), rosterIds, content);
        if (validated) return validated;
      } catch {
        // 缓存文件损坏，忽略并重新生成
      }
    }
  }

  const provider = getAiProvider();
  if (!provider.chatWithTools) {
    console.warn(
      `[Audiobook] 当前 provider（${provider.type}）不支持 function calling，场景 ${context.sceneId} 节点 #${context.nodeIndex} 退化为单一旁白分段`,
    );
    return fallback;
  }

  const messages: ChatMessage[] = [
    { role: 'user', content: SYSTEM_PROMPT },
    { role: 'model', content: '明白，我会仔细判断每段文字真正的朗读者，并调用 submitSegments 提交结果。' },
    { role: 'user', content: buildUserMessage(context, content) },
  ];

  try {
    const response = await provider.chatWithTools(messages, [buildFunctionDeclaration(rosterIds)]);
    addUsage(response.usage);
    const call = response.functionCalls?.find((fc) => fc.name === FUNCTION_NAME);
    if (!call) {
      console.warn(
        `[Audiobook] 场景 ${context.sceneId} 节点 #${context.nodeIndex}：模型未调用 ${FUNCTION_NAME}，退化为单一旁白分段`,
      );
      return fallback;
    }

    const validated = validateSegments(call.args, rosterIds, content);
    if (!validated) {
      console.warn(
        `[Audiobook] 场景 ${context.sceneId} 节点 #${context.nodeIndex}：分段结果未通过校验，退化为单一旁白分段`,
      );
      console.warn(`[Audiobook]   原文: ${content}`);
      console.warn(`[Audiobook]   模型返回: ${JSON.stringify(call.args)}`);
      return fallback;
    }

    // 缓存里存的形状要跟 LLM 原始 function-call args 一致（{ segments: [...] }），
    // 这样读缓存和读 LLM 结果都能走同一套 validateSegments 校验逻辑
    writeCache(gameSlug, cacheFileName, Buffer.from(JSON.stringify({ segments: validated }), 'utf-8'));
    return validated;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(
      `[Audiobook] 场景 ${context.sceneId} 节点 #${context.nodeIndex} 分段调用失败: ${message}，退化为单一旁白分段`,
    );
    return fallback;
  }
}
