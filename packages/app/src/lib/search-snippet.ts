/**
 * Bing 对 muistory.com 的标题/描述长度（issue #24，按它标出的页面反推）：
 * 标题字符数 < 25 过短，显示宽度 > 65 过长（中文和全角算 2）；描述 < 120 字符过短。
 * 书名和简介是 UGC，这里只在输出 meta 时补后缀，不改作品正文。
 * 根布局 title.template 必须与 SITE_TITLE_SUFFIX 一致。
 */
export const SITE_TITLE_SUFFIX = ' | 姆伊游戏书';
export const BING_TITLE_MIN_CHARS = 25;
export const BING_TITLE_MAX_WIDTH = 65;
export const BING_DESCRIPTION_MIN_CHARS = 120;

const TITLE_QUALIFIERS = ['互动小说在线玩', '免费互动小说在线玩', '在线免费玩互动小说游戏'] as const;

const DESCRIPTION_TAILS = [
  '在姆伊游戏书免费在线玩这部互动小说，打开浏览器就能开始，无需下载。',
  '你的每个选择都会通向不同分支和结局，可以反复阅读。',
  '适合想体验互动小说、文字冒险和多结局故事的读者。',
  '从标题页开始，顺着选项往下读，就能走出属于你的故事。',
] as const;

const UNTITLED_SEGMENT = '未命名作品 - 在线免费玩互动小说游戏';

export function charCount(text: string): number {
  return [...text].length;
}

function isWideChar(char: string): boolean {
  const code = char.codePointAt(0) ?? 0;
  return (
    (code >= 0x1100 && code <= 0x115f) ||
    (code >= 0x2e80 && code <= 0xa4cf && code !== 0x303f) ||
    (code >= 0xac00 && code <= 0xd7a3) ||
    (code >= 0xf900 && code <= 0xfaff) ||
    (code >= 0xfe10 && code <= 0xfe19) ||
    (code >= 0xfe30 && code <= 0xfe6f) ||
    (code >= 0xff00 && code <= 0xff60) ||
    (code >= 0xffe0 && code <= 0xffe6)
  );
}

/** 中文和全角算 2，其余（含间隔号 ·）算 1。 */
export function displayWidth(text: string): number {
  let width = 0;
  for (const char of text) {
    width += isWideChar(char) ? 2 : 1;
  }
  return width;
}

export function meetsBingTitle(documentTitle: string): boolean {
  return charCount(documentTitle) >= BING_TITLE_MIN_CHARS && displayWidth(documentTitle) <= BING_TITLE_MAX_WIDTH;
}

export function meetsBingDescription(description: string): boolean {
  return charCount(description) >= BING_DESCRIPTION_MIN_CHARS;
}

export type GameSearchMetadataInput = {
  title: string;
  description?: string;
  backgroundStory?: string;
  tags?: string[];
  sceneCount?: number;
};

export type GameSearchMetadata = {
  /** 交给根布局 title.template 的片段，不要自己再拼站点名 */
  title: string;
  /** Open Graph / Twitter 不用 template，这里带上站点名 */
  socialTitle: string;
  description: string;
};

export function buildGameDocumentTitle(title: string, tags?: string[]): string {
  const trimmed = title.trim();
  if (!trimmed) return UNTITLED_SEGMENT;
  if (meetsBingTitle(withSiteSuffix(trimmed))) return trimmed;

  const primaryTag = tags?.map((tag) => tag.trim()).find((tag) => tag.length > 0 && charCount(tag) <= 6);
  const qualifiers = primaryTag
    ? [...TITLE_QUALIFIERS.map((qualifier) => `${qualifier}（${primaryTag}）`), ...TITLE_QUALIFIERS]
    : [...TITLE_QUALIFIERS];

  for (const qualifier of qualifiers) {
    const segment = `${trimmed} - ${qualifier}`;
    if (meetsBingTitle(withSiteSuffix(segment))) return segment;
  }
  return trimmed;
}

export function buildGameMetaDescription(input: GameSearchMetadataInput): string {
  const base = ensureSentence(pickDescriptionBase(input));
  const extras: string[] = [];
  const tags = (input.tags ?? [])
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)
    .slice(0, 3);
  if (tags.length > 0) extras.push(`题材：${tags.join('、')}。`);
  if (input.sceneCount && input.sceneCount > 0) extras.push(`共 ${input.sceneCount} 个场景。`);
  extras.push(...DESCRIPTION_TAILS);
  return appendUntil(base, extras, BING_DESCRIPTION_MIN_CHARS);
}

export function buildGameSearchMetadata(input: GameSearchMetadataInput): GameSearchMetadata {
  const title = buildGameDocumentTitle(input.title, input.tags);
  return {
    title,
    socialTitle: withSiteSuffix(title),
    description: buildGameMetaDescription(input),
  };
}

function withSiteSuffix(segment: string): string {
  return `${segment}${SITE_TITLE_SUFFIX}`;
}

function pickDescriptionBase(input: GameSearchMetadataInput): string {
  const description = input.description?.trim();
  if (description) return description;
  const background = cleanBackgroundStory(input.backgroundStory);
  if (background) return background;
  const title = input.title.trim() || '这部作品';
  return `在姆伊游戏书在线体验《${title}》，开启你的文字冒险与互动小说之旅。分支剧情由你抉择。`;
}

function cleanBackgroundStory(backgroundStory: string | undefined): string | undefined {
  if (!backgroundStory) return undefined;
  const cleaned = backgroundStory
    .replace(/^[#*>\s-]+/gm, '')
    .replace(/\n+/g, ' ')
    .trim()
    .slice(0, 150);
  return cleaned || undefined;
}

function ensureSentence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  if (/[。！？…]$/.test(trimmed)) return trimmed;
  return `${trimmed}。`;
}

function appendUntil(base: string, extras: string[], minChars: number): string {
  let text = base;
  for (const extra of extras) {
    if (charCount(text) >= minChars) return text;
    text += extra;
  }
  return text;
}
