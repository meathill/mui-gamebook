import { describe, it, expect } from 'vitest';
import { parse } from '@mui-gamebook/parser';
import { generateMermaidGraph } from '../src/commands/graph';

const SAMPLE_SCRIPT = `---
title: "分支测试"
---

# start
* [去A] -> scene_a
* [去B] -> scene_b

# scene_a
* [去结局] -> ending_one

# scene_b
-> ending_two

# ending_one
达成结局一

# ending_two
达成结局二
`;

describe('generateMermaidGraph', () => {
  it('正确生成 Mermaid 图节点与连线', () => {
    const parsed = parse(SAMPLE_SCRIPT);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    const mermaid = generateMermaidGraph(parsed.data);
    expect(mermaid).toContain('flowchart TD');
    expect(mermaid).toContain('start -->|"去A"| scene_a');
    expect(mermaid).toContain('start -->|"去B"| scene_b');
    expect(mermaid).toContain('scene_a -->|"去结局"| ending_one');
    expect(mermaid).toContain('scene_b -.->|redirect| ending_two');
    expect(mermaid).toContain('style ending_one');
    expect(mermaid).toContain('style start');
  });
});
