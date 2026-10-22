import { describe, expect, it } from 'vitest';
import { parse, stringify, type Game } from '@roudanio/parser';
import { gameToFlow, flowToGame } from '@/lib/editor/transformers';
import { readAssetDraft, writeAssetDraft } from '@/lib/editor/dsl-tools/assets';
import { replacePendingAssetInScript, updateScriptMetadata } from '@/lib/editor/script-metadata';

const SOURCE =
  '---\ntitle: 测试\ncustom: keep\n---\n\n# start\n\n```yaml\nimage:\n  prompt: 森林\n  url: pending://42\n  custom: keep-image\nminigame:\n  prompt: 解谜\n  variables:\n    score: 得分\n  custom: keep-game\ncustomScene: keep-scene\n```\n\n第一段\n\n<!-- audio: https://a.test/prose.mp3 -->\n\n![图](https://a.test/image.png)\n\n第二段\n\n-> end (if: gold > 2) (custom: keep-route)\n\n* [下一页] -> end (audio: https://a.test/choice.mp3) (timer: 5)\n\n# end\n\n结束';
function parseGame(source: string): Game {
  const result = parse(source);
  if (!result.success) throw new Error(result.error);
  return result.data;
}

describe('编辑与保存兼容', () => {
  it('正文、静态媒体、跳转顺序及扩展字段经流程图与 DSL 往返不丢失', () => {
    const game = parseGame(SOURCE);
    const flow = gameToFlow(game);
    const next = parseGame(stringify(flowToGame(flow.nodes, flow.edges, game)));
    expect(next.scenes).toEqual(game.scenes);
    expect(next.extra).toEqual(game.extra);
  });

  it('素材表单只改指定分区，保留所有未知字段', () => {
    const source = 'image:\n  prompt: 旧\n  custom: 保留\nminigame:\n  variables:\n    score: 得分\ncustom: 保留';
    const draft = readAssetDraft('image', source);
    const output = writeAssetDraft({ ...draft, prompt: '新' }, source);
    expect(output).toContain('prompt: 新');
    expect(output).toContain('custom: 保留');
    expect(output).toContain('score: 得分');
  });

  it('元数据更新保留正文原文', () => {
    const game = parseGame(SOURCE);
    const output = updateScriptMetadata(SOURCE, { ...game, initialState: { gold: 5 } });
    expect(output.slice(output.indexOf('# start'))).toBe(SOURCE.slice(SOURCE.indexOf('# start')));
    expect(parseGame(output).initialState).toEqual({ gold: 5 });
  });

  it('异步素材回填只改对应 YAML，保留未保存正文与其他字段', () => {
    const source = SOURCE + '\n\n刚输入的内容';
    const output = replacePendingAssetInScript(source, 'pending://42', 'https://a.test/generated.png');
    expect(output).toContain('刚输入的内容');
    expect(output).toContain('custom: keep-image');
    expect(output).not.toContain('pending://42');
    expect(output.slice(output.indexOf('第一段'))).toBe(source.slice(source.indexOf('第一段')));
  });
});
