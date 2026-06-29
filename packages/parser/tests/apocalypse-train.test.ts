import { describe, it, expect } from 'vitest';
import { parse } from '../src';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { validateGameLogic } from '../../../scripts/validate-game-script';

describe('Apocalypse Train script parse test', () => {
  it('should successfully parse apocalypse-train.md and have the correct logic structure', () => {
    const filePath = path.join(__dirname, '../../../demo/apocalypse-train.md');
    const source = fs.readFileSync(filePath, 'utf-8');
    const result = parse(source);

    expect(result.success).toBe(true);
    if (!result.success) {
      console.error(result.error);
      return;
    }

    const { title, description, initialState, scenes } = result.data;

    // 运行逻辑校验
    const issues = validateGameLogic(result.data);
    expect(issues).toEqual([]);

    // 验证游戏元数据
    expect(title).toBe('“默示录”号列车');
    expect(description).toContain('驶向朴茨茅斯的“默示录”号列车');
    expect(initialState).toHaveProperty('has_knife', false);

    // 验证场景是否存在
    expect(scenes).toHaveProperty('start');
    expect(scenes).toHaveProperty('cabin_scene');
    expect(scenes).toHaveProperty('nightmare_first');
    expect(scenes).toHaveProperty('death_by_silent');
    expect(scenes).toHaveProperty('death_by_scream');
    expect(scenes).toHaveProperty('death_transition');
    expect(scenes).toHaveProperty('node_1_map');
    expect(scenes).toHaveProperty('node_1');
    expect(scenes).toHaveProperty('escape_by_knife');
    expect(scenes).toHaveProperty('ending_demo');

    // 验证 start 场景的出口选项
    const startScene = scenes['start'];
    const startChoices = startScene.nodes.filter((n) => n.type === 'choice');
    expect(startChoices.length).toBe(1);
    expect(startChoices[0].nextSceneId).toBe('cabin_scene');

    // 验证 death_transition 的 set 选项
    const transitionScene = scenes['death_transition'];
    const transitionChoices = transitionScene.nodes.filter((n) => n.type === 'choice');
    expect(transitionChoices.length).toBe(1);
    expect(transitionChoices[0].nextSceneId).toBe('node_1_map');
    expect(transitionChoices[0].set).toBe('has_knife = true');

    // 验证 node_1 中的条件选项
    const node1Scene = scenes['node_1'];
    const node1Choices = node1Scene.nodes.filter((n) => n.type === 'choice');
    expect(node1Choices.length).toBe(3);

    const escapeChoice = node1Choices.find((c) => c.nextSceneId === 'escape_by_knife');
    expect(escapeChoice).toBeDefined();
    expect(escapeChoice?.condition).toBe('has_knife == true');
  });
});
