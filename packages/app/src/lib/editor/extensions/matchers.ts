/**
 * DSL 语法匹配器 —— 纯函数，不依赖 TipTap/ProseMirror
 * 用于 Decoration 插件和单元测试
 */

// 选项语法正则
const CHOICE_RE = /\[(.*?)\]\s*->\s*([\w-]+)\s*(.*?)$/;
const IF_CLAUSE_RE = /\(if:\s*(.*?)\)/g;
const SET_CLAUSE_RE = /\(set:\s*(.*?)\)/g;
const AUDIO_CLAUSE_RE = /\(audio:\s*(.*?)\)/g;

// 变量语法正则
const VARIABLE_RE = /\{\{(\w+)\}\}/g;

// 素材 URL 正则
const YAML_URL_RE = /url:\s*(https?:\/\/\S+)/;

export interface ChoiceMatch {
  from: number;
  to: number;
  type: 'choice-text' | 'choice-arrow' | 'choice-target' | 'choice-clause';
}

export interface VariableMatch {
  from: number;
  to: number;
  name: string;
}

export interface AssetUrlMatch {
  url: string;
  /** 素材类型，根据 YAML 块内容判断 */
  assetType: 'image' | 'audio' | 'video' | 'unknown';
}

/**
 * 从文本中找到所有选项语法匹配
 */
export function findChoiceMatches(text: string): ChoiceMatch[] {
  const matches: ChoiceMatch[] = [];
  const m = CHOICE_RE.exec(text);
  if (!m) return matches;

  const matchStart = m.index;

  // [text] 部分
  const bracketStart = matchStart;
  const bracketEnd = bracketStart + m[1].length + 2;
  matches.push({ from: bracketStart, to: bracketEnd, type: 'choice-text' });

  // -> 部分
  const afterBracket = text.indexOf('->', bracketEnd);
  if (afterBracket >= 0) {
    matches.push({ from: afterBracket, to: afterBracket + 2, type: 'choice-arrow' });
  }

  // target 部分
  const targetStart = text.indexOf(m[2], bracketEnd);
  if (targetStart >= 0) {
    matches.push({ from: targetStart, to: targetStart + m[2].length, type: 'choice-target' });
  }

  // clause 部分
  const clauseStr = m[3];
  if (clauseStr) {
    const clauseStart = text.indexOf(clauseStr, targetStart + m[2].length);
    for (const re of [IF_CLAUSE_RE, SET_CLAUSE_RE, AUDIO_CLAUSE_RE]) {
      re.lastIndex = 0;
      let cm: RegExpExecArray | null;
      while ((cm = re.exec(clauseStr)) !== null) {
        const from = clauseStart + cm.index;
        matches.push({ from, to: from + cm[0].length, type: 'choice-clause' });
      }
    }
  }

  return matches;
}

/**
 * 从文本中找到所有 {{variable}} 匹配
 */
export function findVariableMatches(text: string): VariableMatch[] {
  const matches: VariableMatch[] = [];
  VARIABLE_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = VARIABLE_RE.exec(text)) !== null) {
    matches.push({
      from: m.index,
      to: m.index + m[0].length,
      name: m[1],
    });
  }
  return matches;
}

/**
 * 从 YAML 代码块文本中提取素材 URL 和类型
 */
export function extractAssetUrl(yamlText: string): AssetUrlMatch | null {
  const urlMatch = YAML_URL_RE.exec(yamlText);
  if (!urlMatch) return null;

  const url = urlMatch[1];
  let assetType: AssetUrlMatch['assetType'] = 'unknown';

  if (yamlText.includes('image:')) {
    assetType = 'image';
  } else if (yamlText.includes('audio:')) {
    assetType = 'audio';
  } else if (yamlText.includes('video:')) {
    assetType = 'video';
  } else if (/\.(webp|png|jpe?g|gif|svg)(\?|$)/i.test(url)) {
    assetType = 'image';
  } else if (/\.(mp3|wav|ogg|m4a)(\?|$)/i.test(url)) {
    assetType = 'audio';
  } else if (/\.(mp4|webm)(\?|$)/i.test(url)) {
    assetType = 'video';
  }

  return { url, assetType };
}

/* ========== 场景元数据解析 ========== */

export interface SceneMetadata {
  image?: {
    prompt?: string;
    url?: string;
    aspectRatio?: string;
  };
  audio?: {
    type?: string;
    prompt?: string;
    url?: string;
  };
  video?: {
    prompt?: string;
    url?: string;
  };
  minigame?: {
    prompt?: string;
    url?: string;
  };
  characters?: string[];
}

/**
 * 从 YAML 文本中解析场景元数据（image / audio / video / minigame / characters）
 * 采用简单的行级解析，不依赖 js-yaml 库
 */
export function parseSceneMetadata(yamlText: string): SceneMetadata {
  const result: SceneMetadata = {};
  const lines = yamlText.split('\n');
  let currentSection: string | null = null;

  for (const line of lines) {
    const trimmed = line.trimEnd();

    // 顶级字段检测（无缩进）
    if (/^image:\s*$/.test(trimmed)) {
      currentSection = 'image';
      result.image = result.image || {};
      continue;
    }
    if (/^audio:\s*$/.test(trimmed)) {
      currentSection = 'audio';
      result.audio = result.audio || {};
      continue;
    }
    if (/^video:\s*$/.test(trimmed)) {
      currentSection = 'video';
      result.video = result.video || {};
      continue;
    }
    if (/^minigame:\s*$/.test(trimmed)) {
      currentSection = 'minigame';
      result.minigame = result.minigame || {};
      continue;
    }
    if (/^characters:\s*$/.test(trimmed)) {
      currentSection = 'characters';
      result.characters = result.characters || [];
      continue;
    }

    // 顶级 url（常用于 image 的 url 放在顶级）
    const topUrl = trimmed.match(/^url:\s*(https?:\/\/\S+)/);
    if (topUrl) {
      result.image = result.image || {};
      result.image.url = topUrl[1];
      currentSection = null;
      continue;
    }

    // 子字段（有缩进）
    const subField = trimmed.match(/^\s+([\w-]+):\s*(.+)?/);
    if (subField && currentSection) {
      const [, key, rawValue] = subField;
      const value = rawValue?.trim() || '';

      if (currentSection === 'image' && result.image) {
        if (key === 'prompt') result.image.prompt = value;
        else if (key === 'url') result.image.url = value;
        else if (key === 'aspectRatio') result.image.aspectRatio = value;
      } else if (currentSection === 'audio' && result.audio) {
        if (key === 'type') result.audio.type = value;
        else if (key === 'prompt') result.audio.prompt = value;
        else if (key === 'url') result.audio.url = value;
      } else if (currentSection === 'video' && result.video) {
        if (key === 'prompt') result.video.prompt = value;
        else if (key === 'url') result.video.url = value;
      } else if (currentSection === 'minigame' && result.minigame) {
        if (key === 'prompt') result.minigame.prompt = value;
        else if (key === 'url') result.minigame.url = value;
      }
      continue;
    }

    // characters 列表项
    const charItem = trimmed.match(/^\s+-\s+(\S+)/);
    if (charItem && currentSection === 'characters') {
      result.characters = result.characters || [];
      result.characters.push(charItem[1]);
      continue;
    }

    // 空行或无法识别的行不改变 currentSection
    if (trimmed === '') {
      continue;
    }

    // 非缩进且非已知顶级字段 → 重置 section
    if (!trimmed.startsWith(' ') && !trimmed.startsWith('\t')) {
      currentSection = null;
    }
  }

  return result;
}

/**
 * 判断场景元数据是否有实质内容
 */
export function hasMetadataContent(meta: SceneMetadata): boolean {
  return !!(meta.image || meta.audio || meta.video || meta.minigame || (meta.characters && meta.characters.length > 0));
}

/**
 * 将 SceneMetadata 序列化为 YAML 文本
 */
export function serializeSceneMetadata(meta: SceneMetadata): string {
  const lines: string[] = [];

  if (meta.image) {
    lines.push('image:');
    if (meta.image.prompt) lines.push(`  prompt: ${meta.image.prompt}`);
    if (meta.image.url) lines.push(`  url: ${meta.image.url}`);
    if (meta.image.aspectRatio) lines.push(`  aspectRatio: ${meta.image.aspectRatio}`);
  }

  if (meta.characters?.length) {
    lines.push('characters:');
    for (const c of meta.characters) lines.push(`  - ${c}`);
  }

  if (meta.audio) {
    lines.push('audio:');
    if (meta.audio.type) lines.push(`  type: ${meta.audio.type}`);
    if (meta.audio.prompt) lines.push(`  prompt: ${meta.audio.prompt}`);
    if (meta.audio.url) lines.push(`  url: ${meta.audio.url}`);
  }

  if (meta.video) {
    lines.push('video:');
    if (meta.video.prompt) lines.push(`  prompt: ${meta.video.prompt}`);
    if (meta.video.url) lines.push(`  url: ${meta.video.url}`);
  }

  if (meta.minigame) {
    lines.push('minigame:');
    if (meta.minigame.prompt) lines.push(`  prompt: ${meta.minigame.prompt}`);
    if (meta.minigame.url) lines.push(`  url: ${meta.minigame.url}`);
  }

  return lines.join('\n');
}

/**
 * 从 ProseMirror 文档中提取所有场景 ID（H1 标题文本）
 */
export function extractSceneIds(doc: {
  descendants: (cb: (node: any, pos: number) => boolean | void) => void;
}): string[] {
  const ids: string[] = [];
  doc.descendants((node) => {
    if (node.type?.name === 'heading' && node.attrs?.level === 1) {
      const text = node.textContent?.trim();
      if (text) ids.push(text);
    }
  });
  return ids;
}

/**
 * 从 ProseMirror 文档中提取所有被引用的变量名
 */
export function extractReferencedVariables(doc: {
  descendants: (cb: (node: any) => boolean | void) => void;
}): string[] {
  const vars = new Set<string>();
  doc.descendants((node) => {
    if (node.isText && node.text) {
      const matches = findVariableMatches(node.text);
      for (const m of matches) {
        vars.add(m.name);
      }
    }
  });
  return Array.from(vars);
}
