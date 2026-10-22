export const DSL_TOOL_LABELS = {
  scene: '场景',
  choice: '选项',
  redirect: '场景跳转',
  dialogue: '角色对话',
  variable: '变量',
  conditional: '条件文本',
  image: '图片',
  audio: '音频',
  video: '视频',
  minigame: '小游戏',
} as const;

export type DslToolKind = keyof typeof DSL_TOOL_LABELS;
export type AssetToolKind = 'image' | 'audio' | 'video' | 'minigame';

export function isAssetTool(kind: DslToolKind): kind is AssetToolKind {
  return kind === 'image' || kind === 'audio' || kind === 'video' || kind === 'minigame';
}

export interface DslDraft {
  kind: DslToolKind;
  name: string;
  text: string;
  target: string;
  createTarget: boolean;
  condition: string;
  stateChange: string;
  speaker: string;
  emotion: string;
  variable: string;
  thenText: string;
  elseText: string;
  hasElse: boolean;
  prompt: string;
  url: string;
  aspectRatio: string;
  audioType: string;
  minigameVariables: string;
}

export function createDslDraft(kind: DslToolKind): DslDraft {
  return {
    kind,
    name: '',
    text: '',
    target: '',
    createTarget: false,
    condition: '',
    stateChange: '',
    speaker: '',
    emotion: '',
    variable: '',
    thenText: '',
    elseText: '',
    hasElse: false,
    prompt: '',
    url: '',
    aspectRatio: '',
    audioType: 'background_music',
    minigameVariables: '',
  };
}

export interface DslTextSpan {
  from: number;
  to: number;
}

export interface DslEditTarget extends DslTextSpan {
  kind: DslToolKind;
  text: string;
  markerFrom: number;
  markerTo: number;
  blockFrom: number;
}
