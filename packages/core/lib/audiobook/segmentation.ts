/**
 * 有声书文本分段
 * 判断一段场景正文里，哪些部分是旁白、哪些部分是哪个角色的对白
 *
 * 正文里"谁在说话"没有任何结构化字段（对白靠引号+归属短语混在叙述里），
 * 只能靠 LLM 阅读理解来判断，不是字符串匹配问题——尤其是角色互相假扮/
 * 冒充身份说话的场景（例如反派冒充另一个角色），必须结合上下文才能判断
 * 真正的说话人（调用方应维护一个滚动上下文缓冲区传入 precedingExcerpt）。
 *
 * 这里只做"给定一个已构造好的 AiProvider，对文本分段"这一件事，不做任何
 * 缓存——是否缓存、缓存到哪（本地磁盘 / R2 / 不缓存）由调用方决定：Node CLI
 * （packages/asset-generator）和 Workers 应用（packages/app）的缓存策略完全不同。
 */
import type { AiProvider, AiUsageInfo, ChatMessage, FunctionDeclaration } from '../ai-provider';
import { NARRATOR_SPEAKER_ID, type CharacterRoster, type RawSegment, type SegmentationContext } from './types';

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

function buildRosterDescription(roster: CharacterRoster): string {
  if (!roster || Object.keys(roster).length === 0) {
    return '（无角色定义，全部按旁白处理）';
  }
  return Object.entries(roster)
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
  return `## 角色列表\n${buildRosterDescription(context.roster)}\n\n${precedingSection}## 待分段正文（场景: ${
    context.sceneId
  }，节点 #${context.nodeIndex}）\n${content}`;
}

/** 含有引号类字符才值得送 LLM 分段；调用方应先用这个做廉价预筛，无引号时直接判定整段为旁白 */
export function hasQuoteLikeCharacters(text: string): boolean {
  return QUOTE_PATTERN.test(text);
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

export interface SegmentationResult {
  segments: RawSegment[];
  /** 真正调用了 LLM 并拿到响应时才有值（哪怕最终校验失败退化为兜底）；调用方可用它记账 */
  usage?: AiUsageInfo;
  /** true 表示模型分段通过了校验；false 表示各种原因退化成了单一 narrator 兜底分段 */
  validated: boolean;
}

/**
 * 对已确认含引号（值得送 LLM 判断）的文本做说话人分段
 * 调用方应先用 hasQuoteLikeCharacters 做廉价预筛，这里不重复判断
 */
export async function segmentTextWithProvider(
  provider: AiProvider,
  content: string,
  context: SegmentationContext,
): Promise<SegmentationResult> {
  const fallbackSegments: RawSegment[] = [{ speaker: NARRATOR_SPEAKER_ID, text: content }];
  const rosterIds = Object.keys(context.roster);

  if (!provider.chatWithTools) {
    return { segments: fallbackSegments, validated: false };
  }

  const messages: ChatMessage[] = [
    { role: 'user', content: SYSTEM_PROMPT },
    { role: 'model', content: '明白，我会仔细判断每段文字真正的朗读者，并调用 submitSegments 提交结果。' },
    { role: 'user', content: buildUserMessage(context, content) },
  ];

  try {
    const response = await provider.chatWithTools(messages, [buildFunctionDeclaration(rosterIds)]);
    const call = response.functionCalls?.find((fc) => fc.name === FUNCTION_NAME);
    if (!call) {
      return { segments: fallbackSegments, usage: response.usage, validated: false };
    }

    const validated = validateSegments(call.args, rosterIds, content);
    if (!validated) {
      return { segments: fallbackSegments, usage: response.usage, validated: false };
    }

    return { segments: validated, usage: response.usage, validated: true };
  } catch {
    return { segments: fallbackSegments, validated: false };
  }
}
