/**
 * NSFW 内容审查：发布动作的最后闸门
 *
 * 两道检查：
 * 1. 违禁词快筛 —— 免费即时，命中明确色情/未成年人相关词汇直接拒绝
 * 2. LLM 审查 —— 用默认文本模型判断整体内容是否适宜公开发布
 *
 * 审查时机 = 公开可见性变化：草稿发布、已发布作品正文/元数据变更。
 * 纯草稿编辑不审查（省成本）；LLM 故障时 fail-open（不因基础设施问题锁死创作者）。
 *
 * 接入点见 moderatePublishIfNeeded 的调用方：saveEditorContent、cms PUT、
 * MCP updateGameMeta / writeGameContent。管理员手动上架（admin games PATCH）跳过审查。
 */

import { createAiProvider, resolveTextProviderType } from './ai-provider-factory';

/** 明确色情 / 未成年人性相关等硬违禁词（子串匹配，中英文）。
 * 有意保持小而准：模糊词交给 LLM 审查按上下文判断，避免误伤正常创作。
 */
const BANNED_WORDS: readonly string[] = [
  // 性行为露骨描写
  '做爱',
  '性交',
  '口交',
  '肛交',
  '乳交',
  '手淫',
  '自慰',
  '打飞机',
  '精液',
  '射精',
  '淫水',
  '淫液',
  '群交',
  '轮奸',
  '乱伦',
  '性奴',
  '卖淫',
  '嫖娼',
  '援交',
  '开苞',
  '破处',
  '肏',
  '操逼',
  '肉棒',
  '肉穴',
  '奶子',
  // 未成年人相关（零容忍）
  '恋童',
  '娈童',
  '雏妓',
  '儿童色情',
  '幼女性行为',
  '未成年性行为',
  // 常见英文露骨词
  'blowjob',
  'handjob',
  'anal sex',
  'cum shot',
  'cumshot',
  'gangbang',
  'incest sex',
  'child porn',
  'cp porn',
  'hentai',
  'pornhub',
  'onlyfans',
];

/** 正文送审的最大长度（超出截断；DSL 全文超长时以开头为主） */
const CONTENT_EXCERPT_LIMIT = 12_000;
/** 简介 / 背景故事送审的最大长度 */
const META_EXCERPT_LIMIT = 2_000;

export type ModerationSource = 'banned-words' | 'ai' | 'skipped';

export interface ModerationVerdict {
  pass: boolean;
  /** 拒绝时的中文理由，可直接展示给作者 */
  reason?: string;
  source: ModerationSource;
}

export interface ModerationInput {
  title: string;
  description: string | null;
  backgroundStory: string | null;
  content: string;
}

/** 审查未通过时抛出，message 直接展示给作者 */
export class ModerationError extends Error {
  constructor(reason: string) {
    super(`内容审查未通过：${reason}`);
    this.name = 'ModerationError';
  }
}

export function isModerationError(error: unknown): error is ModerationError {
  return error instanceof ModerationError;
}

/** 违禁词快筛，返回命中的词（最多报前 5 个） */
export function checkBannedWords(text: string): string[] {
  const lower = text.toLowerCase();
  const matched: string[] = [];
  for (const word of BANNED_WORDS) {
    if (lower.includes(word.toLowerCase())) {
      matched.push(word);
      if (matched.length >= 5) break;
    }
  }
  return matched;
}

function buildModerationPrompt(input: ModerationInput): string {
  const section = (label: string, value: string | null | undefined, limit: number) => {
    const text = (value ?? '').trim();
    if (!text) return `${label}：（无）`;
    const excerpt = text.length > limit ? `${text.slice(0, limit)}…（已截断）` : text;
    return `${label}：${excerpt}`;
  };
  return [
    '你是互动小说平台的 内容审核员。判断以下用户创作的游戏书作品是否不适宜公开发布。',
    '',
    '拒绝标准（满足其一即 reject）：',
    '- 露骨的色情或性描写（性行为过程、生殖器细节、性挑逗性内容）',
    '- 涉及未成年人的性内容（任何形式，零容忍）',
    '- 极端血腥暴力细节渲染、虐待调教实录',
    '- 仇恨言论、教唆自杀、违法内容',
    '',
    '注意：恋爱与亲密关系描写、战斗与死亡情节、恐怖悬疑题材是游戏创作的正常范畴，不要拒绝；',
    '只在内容确实露骨或违规时拒绝。',
    '',
    section('标题', input.title, 200),
    section('简介', input.description, META_EXCERPT_LIMIT),
    section('背景故事', input.backgroundStory, META_EXCERPT_LIMIT),
    section('正文', input.content, CONTENT_EXCERPT_LIMIT),
    '',
    '只输出 JSON，不要输出其他内容：',
    '{"verdict":"pass","reason":null}',
    '或',
    '{"verdict":"reject","reason":"简短中文理由"}',
  ].join('\n');
}

function parseVerdict(text: string): { verdict: 'pass' | 'reject'; reason?: string } | null {
  // 模型可能包 code fence 或附带说明，取首个 { 到最后一个 } 之间的内容
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1)) as { verdict?: unknown; reason?: unknown };
    if (parsed.verdict !== 'pass' && parsed.verdict !== 'reject') return null;
    return {
      verdict: parsed.verdict,
      reason: typeof parsed.reason === 'string' && parsed.reason.trim() ? parsed.reason.trim() : undefined,
    };
  } catch {
    return null;
  }
}

/** LLM 审查：违禁词未命中时的第二道闸。LLM 故障 / 输出异常时 fail-open。 */
async function moderateByAi(input: ModerationInput): Promise<ModerationVerdict> {
  try {
    const providerType = await resolveTextProviderType();
    const provider = await createAiProvider(providerType);
    const result = await provider.generateText(buildModerationPrompt(input), {
      thinking: false,
      maxOutputTokens: 300,
    });
    const verdict = parseVerdict(result.text);
    if (!verdict) {
      console.warn('[Moderation] LLM 输出无法解析，fail-open 放行');
      return { pass: true, source: 'skipped' };
    }
    return verdict.verdict === 'pass'
      ? { pass: true, source: 'ai' }
      : { pass: false, reason: verdict.reason ?? '内容不适宜公开发布', source: 'ai' };
  } catch (error) {
    console.warn('[Moderation] LLM 审查失败，fail-open 放行:', error);
    return { pass: true, source: 'skipped' };
  }
}

/**
 * 对一份待发布内容执行完整审查（违禁词 + LLM）。
 * reject 时返回 pass: false，由调用方决定抛错 / 标记 / 忽略。
 */
export async function moderateGameContent(input: ModerationInput): Promise<ModerationVerdict> {
  const fullText = [input.title, input.description, input.backgroundStory, input.content].filter(Boolean).join('\n');
  const banned = checkBannedWords(fullText);
  if (banned.length > 0) {
    return {
      pass: false,
      reason: `包含不适宜公开发布的词汇（${banned.join('、')}），请修改后重试`,
      source: 'banned-words',
    };
  }
  return moderateByAi(input);
}

export interface PublishModerationParams {
  /** 本次保存的目标状态 */
  next: {
    published: boolean;
    title: string;
    description: string | null;
    backgroundStory: string | null;
    content: string;
  };
  /** 数据库中的当前状态（content 为 null 表示尚无正文） */
  current: {
    published: boolean;
    title: string | null;
    description: string | null;
    backgroundStory: string | null;
    content: string | null;
  };
}

/**
 * 发布审查守卫：仅当公开可见性或公开内容变化时审查。
 * - 草稿（next.published = false）：不审查
 * - 首次发布：审查
 * - 已发布作品正文 / 元数据变更：审查
 * - 已发布作品无变化的重存：跳过（自动保存免费）
 *
 * reject 时抛 ModerationError。
 */
export async function moderatePublishIfNeeded(params: PublishModerationParams): Promise<void> {
  const { next, current } = params;
  if (!next.published) return;

  const contentChanged = (current.content ?? '') !== next.content;
  const metaChanged =
    (current.title ?? '') !== next.title ||
    (current.description ?? '') !== (next.description ?? '') ||
    (current.backgroundStory ?? '') !== (next.backgroundStory ?? '');
  if (current.published && !contentChanged && !metaChanged) return;

  const verdict = await moderateGameContent({
    title: next.title,
    description: next.description,
    backgroundStory: next.backgroundStory,
    content: next.content,
  });
  if (!verdict.pass) {
    throw new ModerationError(verdict.reason ?? '内容不适宜公开发布');
  }
}
