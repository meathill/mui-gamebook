/**
 * WebMCP 只读工具的实现：场景详情、搜索与剧本校验。
 * 从 core.ts 拆出，避免无头执行器单文件过长。
 */
import { parse, stringify } from '@roudanio/parser';
import type { Diagnostic, Game, Scene, SceneNode } from '@roudanio/parser/src/types';
import { isReferenceableSceneId } from '@roudanio/parser/src/utils';
import { choiceNodes, getScene } from './game-utils';

function sceneProse(scene: Scene): Array<Record<string, unknown>> {
  return scene.nodes.flatMap((node) => {
    if (node.type === 'text') return [{ type: 'text', content: node.content }];
    if (node.type === 'dialogue') {
      return [
        {
          type: 'dialogue',
          speaker: node.speaker,
          content: node.content,
          ...(node.emotion ? { emotion: node.emotion } : {}),
        },
      ];
    }
    return [];
  });
}

/** 场景素材（保留 prompt/url 等作者可见字段） */
function sceneAssets(scene: Scene): SceneNode[] {
  return scene.nodes.filter(
    (node) => node.type !== 'text' && node.type !== 'dialogue' && node.type !== 'choice' && node.type !== 'redirect',
  );
}

function sceneChoices(scene: Scene): Array<Record<string, unknown>> {
  return choiceNodes(scene).map((choice, choiceIndex) => ({
    choiceIndex,
    text: choice.text,
    targetSceneId: choice.nextSceneId,
    ...(choice.condition ? { condition: choice.condition } : {}),
    ...(choice.set ? { set: choice.set } : {}),
  }));
}

function sceneRedirects(scene: Scene): Array<Record<string, unknown>> {
  return scene.nodes.flatMap((node) => {
    if (node.type !== 'redirect') return [];
    return [
      {
        targetSceneId: node.nextSceneId,
        ...(node.condition ? { condition: node.condition } : {}),
        ...(node.set ? { set: node.set } : {}),
      },
    ];
  });
}

function sceneIncoming(game: Game, sceneId: string): Array<Record<string, unknown>> {
  const incoming: Array<Record<string, unknown>> = [];
  for (const [fromSceneId, scene] of Object.entries(game.scenes)) {
    let choiceIndex = 0;
    for (const node of scene.nodes) {
      if (node.type === 'choice') {
        if (node.nextSceneId === sceneId) {
          incoming.push({ fromSceneId, type: 'choice', choiceIndex, text: node.text });
        }
        choiceIndex += 1;
      } else if (node.type === 'redirect' && node.nextSceneId === sceneId) {
        incoming.push({
          fromSceneId,
          type: 'redirect',
          ...(node.condition ? { condition: node.condition } : {}),
        });
      }
    }
  }
  return incoming;
}

export function getSceneDetail(game: Game, sceneId: string): Record<string, unknown> {
  const scene = getScene(game, sceneId);
  return {
    sceneId,
    ...(scene.extra ? { extra: scene.extra } : {}),
    prose: sceneProse(scene),
    assets: sceneAssets(scene),
    choices: sceneChoices(scene),
    redirects: sceneRedirects(scene),
    incoming: sceneIncoming(game, sceneId),
  };
}

function makeSnippet(text: string, query: string): string {
  const index = text.toLowerCase().indexOf(query.toLowerCase());
  if (index < 0) return text.slice(0, 120);
  const start = Math.max(0, index - 40);
  const end = Math.min(text.length, index + query.length + 60);
  return `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`;
}

export function searchScenes(game: Game, query: string, limit: number): Array<Record<string, unknown>> {
  const lower = query.toLowerCase();
  const matches: Array<Record<string, unknown>> = [];
  for (const [sceneId, scene] of Object.entries(game.scenes)) {
    if (matches.length >= limit) break;
    if (sceneId.toLowerCase().includes(lower)) {
      matches.push({ sceneId, field: 'sceneId', snippet: sceneId });
    }
    for (const node of scene.nodes) {
      if (matches.length >= limit) break;
      if (node.type === 'text' || node.type === 'dialogue') {
        if (node.content.toLowerCase().includes(lower)) {
          matches.push({
            sceneId,
            field: node.type === 'dialogue' ? 'dialogue' : 'text',
            ...(node.type === 'dialogue' ? { speaker: node.speaker } : {}),
            snippet: makeSnippet(node.content, query),
          });
        }
      } else if (node.type === 'choice' && node.text.toLowerCase().includes(lower)) {
        matches.push({ sceneId, field: 'choice', snippet: makeSnippet(node.text, query) });
      }
    }
  }
  return matches;
}

export interface ScriptValidation {
  ok: boolean;
  errors: string[];
  warnings: string[];
  diagnostics: Diagnostic[];
}

/** 校验剧本：DSL 解析 + 引用完整性 + 常见内容问题 */
export function validateGame(game: Game): ScriptValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const characters = game.ai.characters ?? {};

  for (const [sceneId, scene] of Object.entries(game.scenes)) {
    if (!isReferenceableSceneId(sceneId)) {
      warnings.push(`场景 ID "${sceneId}" 含不可引用字符（允许字母、数字、下划线、连字符）`);
    }
    for (const node of scene.nodes) {
      if (node.type === 'choice' || node.type === 'redirect') {
        if (!game.scenes[node.nextSceneId]) {
          const label = node.type === 'choice' ? '选项' : '重定向';
          errors.push(`场景 "${sceneId}" 的${label}指向不存在的场景 "${node.nextSceneId}"`);
        }
      }
      if (node.type === 'choice' && !node.text.trim()) {
        warnings.push(`场景 "${sceneId}" 存在空选项文本`);
      }
      if (node.type === 'text') {
        for (const line of node.content.split('\n')) {
          const match = line.match(/^@([\p{L}\p{N}_]+)(?:\s*\([^)]*\))?:/u);
          if (match && !characters[match[1]]) {
            warnings.push(`场景 "${sceneId}" 的对话角色 "${match[1]}" 未注册，该行会按普通文本处理`);
          }
        }
      }
    }
  }

  const parsed = parse(stringify(game));
  if (!parsed.success) {
    errors.push(parsed.error);
  } else {
    for (const diagnostic of parsed.diagnostics) {
      if (diagnostic.severity === 'error') errors.push(diagnostic.message);
      else warnings.push(diagnostic.message);
    }
  }

  return {
    ok: errors.length === 0,
    errors: [...new Set(errors)],
    warnings: [...new Set(warnings)],
    diagnostics: parsed.success ? parsed.diagnostics : [],
  };
}
