import * as yaml from 'js-yaml';
import { createDslDraft, type AssetToolKind, type DslDraft } from './types';

function loadObject(source: string): Record<string, unknown> {
  if (!source.trim()) return {};
  const value: unknown = yaml.load(source);
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('素材 YAML 必须是对象，请先修正原文');
  return value as Record<string, unknown>;
}

export function readAssetDraft(kind: AssetToolKind, source: string): DslDraft {
  const draft = createDslDraft(kind);
  const data = loadObject(source);
  const section = data[kind];
  if (section != null && (typeof section !== 'object' || Array.isArray(section)))
    throw new Error('无法完整读取该素材，请先修正原文');
  const fields = (section ?? {}) as Record<string, unknown>;
  for (const key of ['prompt', 'url', 'aspectRatio'] as const) {
    if (fields[key] != null && typeof fields[key] !== 'string') throw new Error('素材的 ' + key + ' 必须是文字');
    draft[key] = (fields[key] as string) ?? '';
  }
  draft.audioType = typeof fields.type === 'string' ? fields.type : 'background_music';
  draft.minigameVariables = fields.variables ? yaml.dump(fields.variables, { lineWidth: -1 }).trim() : '';
  return draft;
}

export function writeAssetDraft(draft: DslDraft, original: string): string {
  const data = loadObject(original);
  const value = data[draft.kind];
  if (value != null && (typeof value !== 'object' || Array.isArray(value))) throw new Error('无法安全更新这段素材');
  const section = { ...(value as Record<string, unknown> | undefined) };
  for (const key of ['prompt', 'url'] as const) {
    if (draft[key]) section[key] = draft[key];
    else delete section[key];
  }
  if (!draft.prompt.trim() && !draft.url.trim()) throw new Error('请填写素材描述或已有素材地址');
  if (draft.kind === 'image') {
    if (draft.aspectRatio) section.aspectRatio = draft.aspectRatio;
    else delete section.aspectRatio;
  }
  if (draft.kind === 'audio') section.type = draft.audioType;
  if (draft.kind === 'minigame') {
    if (draft.minigameVariables.trim()) {
      const variables = loadObject(draft.minigameVariables);
      if (!Object.values(variables).every((item) => typeof item === 'string'))
        throw new Error('小游戏变量须使用“变量名: 用途说明”的格式');
      section.variables = variables;
    } else delete section.variables;
  }
  data[draft.kind] = section;
  return yaml.dump(data, { lineWidth: -1 }).trimEnd();
}
