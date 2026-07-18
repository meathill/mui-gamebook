/**
 * 大纲 → 剧本生成的提示词与校验
 * 核心目标：确保生成的剧本一定包含角色（ai.characters）与属性（state）
 */
import { parse } from '@mui-gamebook/parser';
import type { Game } from '@mui-gamebook/parser/src/types';

/**
 * 内嵌于系统提示词的完整 frontmatter 示例
 * 守护测试会验证该示例能被 parser 解析出非空 characters/state，防止与 parser 漂移
 */
export const EXAMPLE_SCRIPT = `---
title: "迷雾森林"
description: "一个少女深入迷雾森林寻找失踪弟弟的冒险故事。"
state:
  courage:
    value: 50
    visible: true
    display: progress
    max: 100
    label: "勇气"
  has_lantern:
    value: false
    visible: true
    display: icon
    label: "提灯"
ai:
  style:
    image: "奇幻, 水彩, 柔和光影"
  characters:
    lin_xiaoyu:
      name: "林小雨"
      description: "十五岁的少女，勇敢而细心，为寻找弟弟独自踏入迷雾森林。"
      image_prompt: "一位十五岁的中国少女，扎马尾，背着布包，眼神坚定"
    shou_lin_ren:
      name: "守林人"
      description: "森林深处的神秘老人，知晓迷雾的秘密，言语间常有保留。"
      image_prompt: "一位须发花白的老人，披蓑衣持木杖，站在雾中"
---

# start

雾气在林间弥漫，林小雨握紧了手里的布包。

* [鼓起勇气走向密林深处] -> deep_forest (set: courage = courage + 10)
* [先在林边寻找线索] -> forest_edge

# deep_forest

密林深处传来若隐若现的呼唤声，一位披蓑衣的老人出现在雾中。

@shou_lin_ren (低声): 孩子，这么晚了，雾里可不安全。

* [向守林人求助] -> ask_keeper
* [绕开老人继续前进] -> lost_in_mist (if: courage >= 60 or has_lantern)

# forest_edge

林边的灌木上挂着弟弟的衣角碎片，旁边有一盏遗落的提灯。

* [捡起提灯进入森林] -> deep_forest (set: has_lantern = true)

# ask_keeper

@shou_lin_ren: 你要找的人，在雾的尽头。

@lin_xiaoyu (坚定): 请告诉我怎么走。

-> mist_end (if: courage >= 60 or has_lantern)
-> lost_in_mist

# mist_end

雾气渐渐散开，弟弟的身影出现在小路尽头。

# lost_in_mist

雾越来越浓，小雨迷失了方向……
`;

/** 首次从零生成时的开场设定 */
const GENERATE_SCRIPT_INTRO = `You are an expert game designer for "MUI Gamebook". Your task is to convert a raw story provided by the user into a specific Gamebook DSL (Markdown-based) format. Convert the user's story into a playable game with multiple scenes (at least 3-5), choices, and branching paths. The response streams to the user as it is generated, so there is no need to keep it short — favor a richer, more complete story with more scenes and branches over a minimal one.`;

/** 在已有剧本基础上修改时的开场设定 */
const REVISE_SCRIPT_INTRO = `You are an expert game designer for "MUI Gamebook". The user already has an existing Gamebook DSL script for this game (given below) and wants to revise it based on new story information or instructions they provide. Your task is to output a COMPLETE, REVISED version of the script that incorporates the new information — preserve existing scenes, characters, and variables where they still make sense, and only change what actually needs to change. The response streams to the user as it is generated, so there is no need to keep it short.`;

/** 首次生成与修改共用的硬性规则，与开场设定拼接成完整系统提示词 */
const SCRIPT_RULES = `
## MANDATORY frontmatter requirements (a script missing any of these is INVALID):

1. \`state:\` — Define at least 2 game variables implied by the story (e.g. 勇气/生命值/好感度/金钱/关键道具). Give each meaningful variables metadata (value/visible/display/max/label). Scene choices MUST use \`(set: ...)\` and \`(if: ...)\` to change and check these variables so they actually matter to the story.
2. \`ai.characters:\` — EVERY named character in the story MUST have an entry, keyed by a unique snake_case id, with \`name\`, \`description\` (背景与性格，用中文), and \`image_prompt\` (外貌描述，供 AI 生图使用).

## Example of a valid script (follow this structure exactly):

${EXAMPLE_SCRIPT}

## Other rules:

- IMPORTANT: Scene assets use a \`\`\`yaml code block right after the scene heading, with top-level keys \`image:\` / \`audio:\` / \`minigame:\` (legacy \`minigame-gen\`/\`image-gen\` fences are NOT supported). If a field (like \`prompt\`) contains multi-line text, you MUST use the YAML block scalar syntax (e.g. \`prompt: |\`). Do NOT put a list structure directly under a scalar key without the block scalar indicator.
- Every \`(set: ...)\` assignment MUST contain \`=\` (e.g. \`(set: courage = courage + 10)\`); \`(set: courage + 10)\` is INVALID and will be silently ignored at runtime.
- Character dialogue SHOULD use dialogue lines: \`@character_id: 台词\` or \`@character_id (表情): 台词\` at line start. The id MUST be registered in \`ai.characters\`. Narration stays as plain paragraphs.
- For state-based routing use block redirects instead of duplicated choices: a line \`-> target_scene (if: condition)\` at scene end. Multiple redirects are evaluated in order, first match wins; a redirect without \`(if:)\` is the fallback. A scene with only redirects jumps immediately.
- Conditions support \`or\` / \`and\` / \`not\`, parentheses and arithmetic (e.g. \`(if: courage >= 60 or has_lantern)\`).
- The first scene MUST be \`# start\`.
- Write the story content in the same language as the user's story (通常是中文).
- Output ONLY the raw Markdown content, no extra conversational text.
`;

export const GENERATE_SCRIPT_SYSTEM_PROMPT = `\n${GENERATE_SCRIPT_INTRO}\n${SCRIPT_RULES}`;

export const REVISE_SCRIPT_SYSTEM_PROMPT = `\n${REVISE_SCRIPT_INTRO}\n${SCRIPT_RULES}`;

/**
 * 首轮生成用的精简版 DSL spec：过滤掉 DSL_SPEC.md 中标记为
 * `<!-- first-pass:exclude:start/end -->` 的区间（图片/音频/视频/小游戏生成、TTS
 * 等首轮文本生成用不到的媒体语法细节），降低首轮 prompt 体积。
 * 纠错重生成与 chat 编辑场景仍使用完整版 spec，不受影响。
 */
export function trimDslSpecForFirstPass(dslSpec: string): string {
  return dslSpec.replace(/<!-- first-pass:exclude:start -->[\s\S]*?<!-- first-pass:exclude:end -->\n?/g, '');
}

/**
 * 构建首次生成的完整提示词
 */
export function buildGenerateScriptPrompt(dslSpec: string, story: string): string {
  return `${GENERATE_SCRIPT_SYSTEM_PROMPT}

${dslSpec}

## User Story:

"""${story}"""`;
}

/**
 * 构建"在现有剧本基础上修改"的提示词：附上完整的现有剧本，让模型在此基础上
 * 结合新信息输出修订后的完整剧本，而不是从零生成
 */
export function buildReviseScriptPrompt(dslSpec: string, existingScript: string, story: string): string {
  return `${REVISE_SCRIPT_SYSTEM_PROMPT}

${dslSpec}

## Existing Script:

${existingScript}

## New Story Information / Instructions From The User:

"""${story}"""`;
}

/**
 * 判断一个已解析的游戏是否已经有"实质性"剧本内容，而不是新建游戏时的空白模板
 * （只有一个 start 场景、没有角色、没有变量）。用于决定点击"生成游戏脚本"时
 * 要不要先询问用户是重新生成还是在现有剧本基础上修改。
 */
export function hasSubstantialScript(game: Pick<Game, 'scenes' | 'ai' | 'initialState'> | null | undefined): boolean {
  if (!game) return false;
  return (
    Object.keys(game.scenes ?? {}).length > 1 ||
    Object.keys(game.ai?.characters ?? {}).length > 0 ||
    Object.keys(game.initialState ?? {}).length > 0
  );
}

/**
 * 剥离 AI 可能包裹的 Markdown 代码块标记
 */
export function stripCodeFence(text: string): string {
  return text
    .replace(/^```markdown\n/, '')
    .replace(/^```\n/, '')
    .replace(/\n```$/, '');
}

export interface ScriptValidationResult {
  ok: boolean;
  parseError?: string;
  missingCharacters: boolean;
  missingState: boolean;
}

/**
 * 校验生成的剧本：能否解析、是否包含角色与属性
 */
export function validateGeneratedScript(script: string): ScriptValidationResult {
  const result = parse(script);
  if (!result.success) {
    return { ok: false, parseError: result.error, missingCharacters: true, missingState: true };
  }

  const missingCharacters = Object.keys(result.data.ai?.characters ?? {}).length === 0;
  const missingState = Object.keys(result.data.initialState ?? {}).length === 0;

  return {
    ok: !missingCharacters && !missingState,
    missingCharacters,
    missingState,
  };
}

/**
 * 构建一次性纠错提示词（附上第一版剧本，要求补齐缺失部分后输出完整剧本）
 */
export function buildCorrectionPrompt(script: string, validation: ScriptValidationResult): string {
  const problems: string[] = [];
  if (validation.parseError) {
    problems.push(`- 剧本无法通过解析器校验，错误：${validation.parseError}`);
  }
  if (validation.missingCharacters) {
    problems.push(
      '- frontmatter 缺少 `ai.characters`：请为故事中每一个有名字的角色补充条目（id/name/description/image_prompt）',
    );
  }
  if (validation.missingState) {
    problems.push(
      '- frontmatter 缺少 `state`：请根据故事补充至少 2 个游戏变量（含 value/visible/label 等元数据），并在场景选项中用 `(set: ...)`/`(if: ...)` 接入这些变量',
    );
  }

  return `你刚才生成的 Gamebook DSL 剧本有以下问题：

${problems.join('\n')}

请修复这些问题，输出修正后的**完整剧本**（保留原有的场景与选项结构，只补齐/修正缺失部分）。只输出原始 Markdown，不要任何解释文字。

以下是你刚才生成的剧本：

${script}`;
}
