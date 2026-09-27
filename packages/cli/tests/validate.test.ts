import { describe, it, expect } from 'vitest';
import { validateScriptContent, formatReportText } from '../src/commands/validate';

const VALID_SCRIPT = `---
title: "测试完整剧本"
author: "测试员"
initialState:
  coins: 10
  has_key: false
ai:
  characters:
    alice:
      name: "爱丽丝"
---

# start
你在城堡大厅中。

@alice: 欢迎来到测试城堡！

* [拿钥匙] -> get_key (set: has_key = true)
* [四处闲逛] -> hallway

# get_key
你拿到了钥匙。

* [返回大厅] -> start

# hallway
走廊尽头有一扇紧闭的门。

* [用钥匙开门] -> secret_room (if: has_key == true)
* [返回大厅] -> start

# secret_room
你进入了密室，达成了探秘结局！
`;

describe('validateScriptContent', () => {
  it('验证合法完整剧本无阻断错误', () => {
    const report = validateScriptContent(VALID_SCRIPT);
    expect(report.valid).toBe(true);
    expect(report.errors).toHaveLength(0);
    expect(report.stats.scenesCount).toBe(4);
    expect(report.stats.endingsCount).toBe(1); // secret_room 没有出度
    expect(report.stats.variablesCount).toBe(2);
  });

  it('排查缺失 # start 场景', () => {
    const script = `---
title: "无入口"
---

# scene1
没有 start 场景。
`;
    const report = validateScriptContent(script);
    expect(report.valid).toBe(false);
    expect(report.errors.some((e) => e.code === 'MISSING_START')).toBe(true);
  });

  it('排查悬空跳转目标 (DANGLING_TARGET)', () => {
    const script = `---
title: "悬空跳转"
---

# start
* [走向虚空] -> non_existent_scene
* [原地休息] -> start
`;
    const report = validateScriptContent(script);
    expect(report.valid).toBe(false);
    expect(report.errors.some((e) => e.code === 'DANGLING_TARGET')).toBe(true);
    expect(report.errors[0].message).toContain('non_existent_scene');
  });

  it('排查死局选项卡关 (DEAD_END)', () => {
    const script = `---
title: "死局测试"
initialState:
  gold: 0
  key: false
---

# start
* [黄金开门] -> door (if: gold >= 100)
* [钥匙开门] -> door (if: key == true)
`;
    const report = validateScriptContent(script);
    expect(report.valid).toBe(false);
    expect(report.errors.some((e) => e.code === 'DEAD_END')).toBe(true);
  });

  it('排查未在 initialState 声明的变量 (UNDECLARED_VARIABLE)', () => {
    const script = `---
title: "变量未声明"
initialState:
  score: 0
---

# start
* [进入暗门] -> start (if: unknown_var > 5)
`;
    const report = validateScriptContent(script);
    expect(report.valid).toBe(false);
    expect(report.errors.some((e) => e.code === 'UNDECLARED_VARIABLE')).toBe(true);
  });

  it('排查孤岛场景 (ORPHAN_SCENE 警告)', () => {
    const script = `---
title: "孤岛测试"
---

# start
* [留在起点] -> start

# island
孤立无援的场景，没有任何选项指向这里。
`;
    const report = validateScriptContent(script);
    expect(report.warnings.some((w) => w.code === 'ORPHAN_SCENE')).toBe(true);
    expect(report.warnings.find((w) => w.code === 'ORPHAN_SCENE')?.sceneId).toBe('island');
  });

  it('排查未在 ai.characters 注册的角色 (UNREGISTERED_CHARACTER 警告)', () => {
    const script = `---
title: "角色未注册"
---

# start
@ghost: 我是没有身份设定的幽灵角色。

* [逃跑] -> start
`;
    const report = validateScriptContent(script);
    expect(report.warnings.some((w) => w.code === 'UNREGISTERED_CHARACTER')).toBe(true);
  });

  it('格式化输出包含标题与指标', () => {
    const report = validateScriptContent(VALID_SCRIPT);
    const text = formatReportText(report);
    expect(text).toContain('测试完整剧本');
    expect(text).toContain('PASSED');
    expect(text).toContain('场景总数: 4');
  });
});
