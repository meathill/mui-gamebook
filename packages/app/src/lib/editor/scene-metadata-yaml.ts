/**
 * 场景元数据 yaml 块的读写 —— 服务于 text 模式的场景元数据表单。
 *
 * - parse：js-yaml 优先（正确处理引号、块标量、flow 格式），
 *   load 失败或提取不到已知字段时回落行级容错解析（容忍用户边打字边残缺的 yaml）。
 * - serialize：以原 yaml 为基底做 round-trip，只覆写表单管理的字段；
 *   未知顶层键与 section 内非表单字段（minigame.variables、image.characters 等）
 *   原样保留，对齐 DSL v2 的未知键透传约定（docs/DSL_V2_DESIGN.md §4.3）。
 */
import * as yaml from 'js-yaml';

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

/** 表单管理的字段。serialize 只对这些键做覆写/删除，其余子键一律取自基底 */
const MANAGED_SECTION_FIELDS = {
  image: ['prompt', 'url', 'aspectRatio'],
  audio: ['type', 'prompt', 'url'],
  video: ['prompt', 'url'],
  minigame: ['prompt', 'url'],
} as const;

const MANAGED_SECTION_KEYS = ['image', 'audio', 'video', 'minigame'] as const;

const HTTP_URL_RE = /^https?:\/\//;

/** js-yaml v5 对空串/残缺输入会抛异常；仅接受 plain object 形态 */
function tryLoadYamlObject(text: string | undefined): Record<string, unknown> | null {
  if (!text?.trim()) return null;
  try {
    const loaded: unknown = yaml.load(text);
    if (loaded && typeof loaded === 'object' && !Array.isArray(loaded)) {
      return loaded as Record<string, unknown>;
    }
  } catch {
    // 残缺 yaml → 交给行级容错解析或空基底
  }
  return null;
}

/** `image:` 裸键（null）视为空 section；标量/数组形态返回 null（表单不认识，serialize 时原样保留） */
function asSectionRecord(value: unknown): Record<string, unknown> | null {
  if (value === null) return {};
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function pickString(source: Record<string, unknown>, key: string): string | undefined {
  const value = source[key];
  if (typeof value === 'string') return value || undefined;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return undefined;
}

function pickSectionFields(source: Record<string, unknown>, fields: readonly string[]): Record<string, string> {
  const picked: Record<string, string> = {};
  for (const field of fields) {
    const value = pickString(source, field);
    if (value !== undefined) picked[field] = value;
  }
  return picked;
}

/** 从 js-yaml load 结果中提取表单认识的字段 */
function extractSceneMetadata(data: Record<string, unknown>): SceneMetadata {
  const result: SceneMetadata = {};

  const image = 'image' in data ? asSectionRecord(data.image) : null;
  if (image) result.image = pickSectionFields(image, MANAGED_SECTION_FIELDS.image);

  const audio = 'audio' in data ? asSectionRecord(data.audio) : null;
  if (audio) result.audio = pickSectionFields(audio, MANAGED_SECTION_FIELDS.audio);

  const video = 'video' in data ? asSectionRecord(data.video) : null;
  if (video) result.video = pickSectionFields(video, MANAGED_SECTION_FIELDS.video);

  const minigame = 'minigame' in data ? asSectionRecord(data.minigame) : null;
  if (minigame) result.minigame = pickSectionFields(minigame, MANAGED_SECTION_FIELDS.minigame);

  // 顶级 url 归入 image（常见简写形态；image 自带 url 时以嵌套的为准）
  if (typeof data.url === 'string' && HTTP_URL_RE.test(data.url) && !result.image?.url) {
    result.image = { ...result.image, url: data.url };
  }

  if (Array.isArray(data.characters)) {
    result.characters = data.characters
      .filter((item): item is string | number => typeof item === 'string' || typeof item === 'number')
      .map(String)
      .filter(Boolean);
  }

  return result;
}

/**
 * 行级容错解析 —— 容忍残缺 yaml，仅作为 js-yaml 失败时的回落
 */
function parseSceneMetadataLines(yamlText: string): SceneMetadata {
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
 * 从 YAML 文本中解析场景元数据（image / audio / video / minigame / characters）
 */
export function parseSceneMetadata(yamlText: string): SceneMetadata {
  const loaded = tryLoadYamlObject(yamlText);
  if (loaded) {
    const known = extractSceneMetadata(loaded);
    if (hasMetadataContent(known)) return known;
  }
  return parseSceneMetadataLines(yamlText);
}

/**
 * 判断场景元数据是否有实质内容
 */
export function hasMetadataContent(meta: SceneMetadata): boolean {
  return !!(meta.image || meta.audio || meta.video || meta.minigame || (meta.characters && meta.characters.length > 0));
}

/**
 * 将 SceneMetadata 序列化为 YAML 文本。
 *
 * 传入 originalYaml 时以其为基底做 round-trip：只覆写表单管理的字段
 * （truthy 覆写、空值删键），未知顶层键与 section 内其余子键原样保留。
 * meta 中为 undefined 的 section 表示「解析层未认出」而非用户删除，基底原样保留。
 */
export function serializeSceneMetadata(meta: SceneMetadata, originalYaml?: string): string {
  const base: Record<string, unknown> = tryLoadYamlObject(originalYaml) ?? {};

  // 顶级 url 在 parse 时折叠进 image.url，保存后统一写在 image 下，避免双写
  if (meta.image && typeof base.url === 'string' && HTTP_URL_RE.test(base.url)) {
    delete base.url;
  }

  for (const section of MANAGED_SECTION_KEYS) {
    const sectionMeta = meta[section] as Partial<Record<string, string>> | undefined;
    if (sectionMeta === undefined) continue;
    const merged = { ...(asSectionRecord(base[section]) ?? {}) };
    for (const field of MANAGED_SECTION_FIELDS[section]) {
      const value = sectionMeta[field];
      if (value) merged[field] = value;
      else delete merged[field];
    }
    base[section] = merged;
  }

  if (meta.characters !== undefined) {
    if (meta.characters.length > 0) base.characters = meta.characters;
    else delete base.characters;
  }

  if (Object.keys(base).length === 0) return '';

  const dumped = yaml.dump(base, { indent: 2, lineWidth: -1 }).trim();
  // js-yaml 没有输出裸键的选项：把顶级空 section / null 还原为 `video:` 形态，
  // 与行级解析器兼容（行首锚定不会误伤必有缩进的块标量内容行）
  return dumped.replace(/^([\w-]+): (\{\}|null)$/gm, '$1:');
}
