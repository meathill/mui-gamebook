/**
 * WebMCP 无头执行内核：直接操作 Game 对象，无 React/Flow 依赖。
 * 后端 /api/mcp 与单测走这里；编辑器 in-page tools 复用既有 HandlerContext 链路（含 undo）。
 */
import type { Game, GameStateValue, Scene, SceneChoiceNode, SceneNode } from '@mui-gamebook/parser/src/types';
import { sortWebMcpCalls } from './tools';

export interface WebMcpCall {
  name: string;
  args: Record<string, unknown>;
}

export interface WebMcpResult {
  ok: boolean;
  message: string;
}

function requireString(args: Record<string, unknown>, key: string): string {
  const v = args[key];
  if (typeof v !== 'string' || !v) throw new Error(`缺少参数: ${key}`);
  return v;
}

function requireChoiceIndex(args: Record<string, unknown>): number {
  const v = args['choiceIndex'];
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 0) throw new Error('choiceIndex 非法');
  return v;
}

function getScene(game: Game, sceneId: string): Scene {
  const scene = game.scenes[sceneId];
  if (!scene) throw new Error(`场景不存在: ${sceneId}`);
  return scene;
}

function choiceNodes(scene: Scene): SceneChoiceNode[] {
  return scene.nodes.filter((n): n is SceneChoiceNode => n.type === 'choice');
}

/** 解析变量值：true/false/数字优先，否则保留字符串 */
export function parseVariableValue(value: string): string | number | boolean {
  if (value === 'true') return true;
  if (value === 'false') return false;
  const num = Number(value);
  if (value.trim() !== '' && !Number.isNaN(num)) return num;
  return value;
}

function setStateValue(game: Game, name: string, value: GameStateValue): void {
  game.initialState[name] = value;
  if (game.state) game.state[name] = value;
}

function ensureCharacters(game: Game): NonNullable<Game['ai']['characters']> {
  if (!game.ai.characters) game.ai.characters = {};
  return game.ai.characters;
}

/** 纯函数清理：删除指向不存在场景的选项与重定向，返回清理数量 */
export function cleanupInvalidChoices(game: Game): number {
  let removed = 0;
  for (const scene of Object.values(game.scenes)) {
    const before = scene.nodes.length;
    scene.nodes = scene.nodes.filter((n) => {
      if (n.type === 'choice' || n.type === 'redirect') {
        if (!game.scenes[n.nextSceneId]) {
          removed += 1;
          return false;
        }
      }
      return true;
    });
    if (scene.nodes.length !== before) {
      // 原地过滤已完成
    }
  }
  return removed;
}

function cloneGame(game: Game): Game {
  return JSON.parse(JSON.stringify(game)) as Game;
}

export function executeWebMcpCall(game: Game, call: WebMcpCall): WebMcpResult {
  const { name, args } = call;
  switch (name) {
    case 'getDsl':
      return { ok: true, message: `共 ${Object.keys(game.scenes).length} 个场景` };
    case 'listScenes': {
      const list = Object.entries(game.scenes)
        .map(([id, s]) => `${id}(${s.nodes.length})`)
        .join(', ');
      return { ok: true, message: list || '暂无场景' };
    }
    case 'addScene': {
      const sceneId = requireString(args, 'sceneId');
      const content = requireString(args, 'content');
      if (game.scenes[sceneId]) throw new Error(`场景已存在: ${sceneId}`);
      game.scenes[sceneId] = { id: sceneId, nodes: [{ type: 'text', content }] };
      return { ok: true, message: `已添加场景 ${sceneId}` };
    }
    case 'updateScene': {
      const sceneId = requireString(args, 'sceneId');
      const content = requireString(args, 'content');
      const scene = getScene(game, sceneId);
      const keep = scene.nodes.filter((n) => n.type === 'choice' || n.type === 'redirect');
      scene.nodes = [{ type: 'text', content }, ...keep];
      return { ok: true, message: `已覆盖场景 ${sceneId}` };
    }
    case 'updateSceneText': {
      const sceneId = requireString(args, 'sceneId');
      const text = requireString(args, 'text');
      const scene = getScene(game, sceneId);
      scene.nodes = scene.nodes.filter((n) => n.type !== 'text' && n.type !== 'dialogue');
      // 文案插到素材之后、选项之前，保持落盘顺序约定
      const choiceStart = scene.nodes.findIndex((n) => n.type === 'choice' || n.type === 'redirect');
      const textNode: SceneNode = { type: 'text', content: text };
      if (choiceStart === -1) scene.nodes.push(textNode);
      else scene.nodes.splice(choiceStart, 0, textNode);
      return { ok: true, message: `已更新场景文案 ${sceneId}` };
    }
    case 'updateSceneImagePrompt': {
      const sceneId = requireString(args, 'sceneId');
      const imagePrompt = requireString(args, 'imagePrompt');
      const scene = getScene(game, sceneId);
      const img = scene.nodes.find((n) => n.type === 'ai_image');
      if (img && img.type === 'ai_image') {
        img.prompt = imagePrompt;
      } else {
        scene.nodes.unshift({ type: 'ai_image', prompt: imagePrompt });
      }
      return { ok: true, message: `已更新场景配图 prompt ${sceneId}` };
    }
    case 'deleteScene': {
      const sceneId = requireString(args, 'sceneId');
      if (!game.scenes[sceneId]) throw new Error(`场景不存在: ${sceneId}`);
      delete game.scenes[sceneId];
      const removed = cleanupInvalidChoices(game);
      return { ok: true, message: `已删除场景 ${sceneId}，清理悬空指向 ${removed} 条` };
    }
    case 'renameScene': {
      const oldId = requireString(args, 'oldId');
      const newId = requireString(args, 'newId');
      if (!game.scenes[oldId]) throw new Error(`场景不存在: ${oldId}`);
      if (game.scenes[newId]) throw new Error(`场景已存在: ${newId}`);
      game.scenes[newId] = { ...game.scenes[oldId], id: newId };
      delete game.scenes[oldId];
      for (const scene of Object.values(game.scenes)) {
        for (const n of scene.nodes) {
          if ((n.type === 'choice' || n.type === 'redirect') && n.nextSceneId === oldId) {
            n.nextSceneId = newId;
          }
        }
      }
      return { ok: true, message: `已重命名 ${oldId} -> ${newId}` };
    }
    case 'addDialogueLine': {
      const sceneId = requireString(args, 'sceneId');
      const speaker = requireString(args, 'speaker');
      const content = requireString(args, 'content');
      const scene = getScene(game, sceneId);
      if (!game.ai.characters?.[speaker]) throw new Error(`角色未注册: ${speaker}`);
      const emotion = typeof args['emotion'] === 'string' ? (args['emotion'] as string) : undefined;
      const node: SceneNode = { type: 'dialogue', speaker, content, ...(emotion ? { emotion } : {}) };
      const choiceStart = scene.nodes.findIndex((n) => n.type === 'choice' || n.type === 'redirect');
      if (choiceStart === -1) scene.nodes.push(node);
      else scene.nodes.splice(choiceStart, 0, node);
      return { ok: true, message: `已在 ${sceneId} 追加 @${speaker} 台词` };
    }
    case 'addRedirect': {
      const sceneId = requireString(args, 'sceneId');
      const targetSceneId = requireString(args, 'targetSceneId');
      const scene = getScene(game, sceneId);
      if (!game.scenes[targetSceneId]) throw new Error(`目标场景不存在: ${targetSceneId}`);
      scene.nodes.push({
        type: 'redirect',
        nextSceneId: targetSceneId,
        ...(typeof args['condition'] === 'string' ? { condition: args['condition'] as string } : {}),
        ...(typeof args['stateChange'] === 'string' ? { set: args['stateChange'] as string } : {}),
      });
      return { ok: true, message: `已在 ${sceneId} 追加重定向 -> ${targetSceneId}` };
    }
    case 'addChoice': {
      const sceneId = requireString(args, 'sceneId');
      const text = requireString(args, 'text');
      const targetSceneId = requireString(args, 'targetSceneId');
      const scene = getScene(game, sceneId);
      if (!game.scenes[targetSceneId]) throw new Error(`目标场景不存在: ${targetSceneId}`);
      const exists = choiceNodes(scene).some((c) => c.text === text && c.nextSceneId === targetSceneId);
      if (exists) return { ok: true, message: '选项已存在，跳过' };
      scene.nodes.push({
        type: 'choice',
        text,
        nextSceneId: targetSceneId,
        ...(typeof args['condition'] === 'string' ? { condition: args['condition'] as string } : {}),
        ...(typeof args['stateChange'] === 'string' ? { set: args['stateChange'] as string } : {}),
      });
      return { ok: true, message: `已在 ${sceneId} 添加选项` };
    }
    case 'updateChoice':
    case 'updateChoiceText':
    case 'updateChoiceTarget':
    case 'updateChoiceCondition': {
      const sceneId = requireString(args, 'sceneId');
      const idx = requireChoiceIndex(args);
      const scene = getScene(game, sceneId);
      const choices = choiceNodes(scene);
      const target = choices[idx];
      if (!target) throw new Error(`选项不存在: ${sceneId}[${idx}]`);
      if (name === 'updateChoiceText') target.text = requireString(args, 'text');
      if (name === 'updateChoiceTarget') {
        const next = requireString(args, 'targetSceneId');
        if (!game.scenes[next]) throw new Error(`目标场景不存在: ${next}`);
        target.nextSceneId = next;
      }
      if (name === 'updateChoiceCondition') target.condition = requireString(args, 'condition');
      if (name === 'updateChoice') {
        if (typeof args['text'] === 'string') target.text = args['text'] as string;
        if (typeof args['targetSceneId'] === 'string') {
          if (!game.scenes[args['targetSceneId'] as string])
            throw new Error(`目标场景不存在: ${args['targetSceneId']}`);
          target.nextSceneId = args['targetSceneId'] as string;
        }
        if (typeof args['condition'] === 'string') target.condition = args['condition'] as string;
        if (typeof args['stateChange'] === 'string') target.set = args['stateChange'] as string;
      }
      return { ok: true, message: `已更新选项 ${sceneId}[${idx}]` };
    }
    case 'deleteChoice': {
      const sceneId = requireString(args, 'sceneId');
      const idx = requireChoiceIndex(args);
      const scene = getScene(game, sceneId);
      const choices = choiceNodes(scene);
      if (!choices[idx]) throw new Error(`选项不存在: ${sceneId}[${idx}]`);
      scene.nodes = scene.nodes.filter((n) => n !== choices[idx]);
      return { ok: true, message: `已删除选项 ${sceneId}[${idx}]` };
    }
    case 'addVariable': {
      const varName = requireString(args, 'name');
      const value = requireString(args, 'value');
      if (varName in game.initialState) throw new Error(`变量已存在: ${varName}`);
      const parsed = parseVariableValue(value);
      const meta: GameStateValue =
        typeof args['visible'] === 'boolean' || typeof args['label'] === 'string'
          ? {
              value: parsed,
              ...(typeof args['visible'] === 'boolean' ? { visible: args['visible'] as boolean } : {}),
              ...(typeof args['label'] === 'string' ? { label: args['label'] as string } : {}),
            }
          : parsed;
      setStateValue(game, varName, meta);
      return { ok: true, message: `已添加变量 ${varName}` };
    }
    case 'updateVariable': {
      const varName = requireString(args, 'name');
      if (!(varName in game.initialState)) throw new Error(`变量不存在: ${varName}`);
      const current = game.initialState[varName];
      if (typeof args['value'] === 'string') {
        const parsed = parseVariableValue(args['value'] as string);
        if (typeof current === 'object' && current !== null) {
          setStateValue(game, varName, { ...(current as object), value: parsed } as GameStateValue);
        } else {
          setStateValue(game, varName, parsed);
        }
      }
      if (typeof args['visible'] === 'boolean' || typeof args['label'] === 'string') {
        const base: Record<string, unknown> =
          typeof current === 'object' && current !== null ? { ...(current as object) } : { value: current };
        if (typeof args['visible'] === 'boolean') base['visible'] = args['visible'];
        if (typeof args['label'] === 'string') base['label'] = args['label'];
        setStateValue(game, varName, base as unknown as GameStateValue);
      }
      return { ok: true, message: `已更新变量 ${varName}` };
    }
    case 'deleteVariable': {
      const varName = requireString(args, 'name');
      if (!(varName in game.initialState)) throw new Error(`变量不存在: ${varName}`);
      delete game.initialState[varName];
      if (game.state) delete game.state[varName];
      return { ok: true, message: `已删除变量 ${varName}` };
    }
    case 'addCharacter': {
      const charId = requireString(args, 'id');
      const charName = requireString(args, 'name');
      const chars = ensureCharacters(game);
      if (chars[charId]) throw new Error(`角色已存在: ${charId}`);
      chars[charId] = {
        name: charName,
        ...(typeof args['description'] === 'string' ? { description: args['description'] as string } : {}),
        ...(typeof args['imagePrompt'] === 'string' ? { image_prompt: args['imagePrompt'] as string } : {}),
      };
      return { ok: true, message: `已添加角色 ${charId}` };
    }
    case 'updateCharacter': {
      const charId = requireString(args, 'id');
      const chars = ensureCharacters(game);
      if (!chars[charId]) throw new Error(`角色不存在: ${charId}`);
      if (typeof args['name'] === 'string') chars[charId].name = args['name'] as string;
      if (typeof args['description'] === 'string') chars[charId].description = args['description'] as string;
      if (typeof args['imagePrompt'] === 'string') chars[charId].image_prompt = args['imagePrompt'] as string;
      return { ok: true, message: `已更新角色 ${charId}` };
    }
    case 'deleteCharacter': {
      const charId = requireString(args, 'id');
      const chars = ensureCharacters(game);
      if (!chars[charId]) throw new Error(`角色不存在: ${charId}`);
      delete chars[charId];
      return { ok: true, message: `已删除角色 ${charId}` };
    }
    default:
      throw new Error(`未知工具: ${name}`);
  }
}

/**
 * 批量执行：按 增→删→改 排序，逐个执行（单条失败不中断，后续继续），最后清理悬空指向。
 * 返回每条结果；调用方按需决定是否整体回滚（dryRun 场景传克隆对象即可）。
 */
export function executeWebMcpBatch(game: Game, calls: WebMcpCall[]): WebMcpResult[] {
  const sorted = sortWebMcpCalls(calls);
  const results: WebMcpResult[] = [];
  for (const call of sorted) {
    try {
      results.push(executeWebMcpCall(game, call));
    } catch (e) {
      results.push({ ok: false, message: (e as Error).message });
    }
  }
  cleanupInvalidChoices(game);
  return results;
}

/** dryRun：在克隆上执行，返回结果与克隆后的 Game，原对象不受影响 */
export function dryRunWebMcpBatch(game: Game, calls: WebMcpCall[]): { results: WebMcpResult[]; game: Game } {
  const cloned = cloneGame(game);
  const results = executeWebMcpBatch(cloned, calls);
  return { results, game: cloned };
}
