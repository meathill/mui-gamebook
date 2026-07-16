import { describe, it, expect } from 'vitest';
import * as yaml from 'js-yaml';
import { parseSceneMetadata, hasMetadataContent, serializeSceneMetadata } from '@/lib/editor/scene-metadata-yaml';

describe('parseSceneMetadata', () => {
  it('解析完整的场景元数据', () => {
    const text = `image:
  prompt: Night time, Zhumadian long distance bus station
characters:
  - liu_quan
url: https://i.muistory.com/images/scene_start.webp
audio:
  type: background_music
  prompt: City noise, cold wind, distant traffic`;

    const result = parseSceneMetadata(text);
    expect(result.image).toEqual({
      prompt: 'Night time, Zhumadian long distance bus station',
      url: 'https://i.muistory.com/images/scene_start.webp',
    });
    expect(result.audio).toEqual({
      type: 'background_music',
      prompt: 'City noise, cold wind, distant traffic',
    });
    expect(result.characters).toEqual(['liu_quan']);
  });

  it('解析只有 image 的 YAML', () => {
    const text = `image:
  prompt: A castle in clouds
  url: https://example.com/castle.webp
  aspectRatio: 16:9`;

    const result = parseSceneMetadata(text);
    expect(result.image).toEqual({
      prompt: 'A castle in clouds',
      url: 'https://example.com/castle.webp',
      aspectRatio: '16:9',
    });
    expect(result.audio).toBeUndefined();
    expect(result.characters).toBeUndefined();
  });

  it('解析只有 audio 的 YAML', () => {
    const text = `audio:
  type: sfx
  prompt: Thunder and rain
  url: https://example.com/thunder.mp3`;

    const result = parseSceneMetadata(text);
    expect(result.audio).toEqual({
      type: 'sfx',
      prompt: 'Thunder and rain',
      url: 'https://example.com/thunder.mp3',
    });
    expect(result.image).toBeUndefined();
  });

  it('解析 video 元数据', () => {
    const text = `video:
  prompt: Door opening slowly
  url: https://example.com/door.mp4`;

    const result = parseSceneMetadata(text);
    expect(result.video).toEqual({
      prompt: 'Door opening slowly',
      url: 'https://example.com/door.mp4',
    });
  });

  it('解析 minigame 元数据', () => {
    const text = `minigame:
  prompt: Tap the golden snitch game
  url: https://example.com/game.html`;

    const result = parseSceneMetadata(text);
    expect(result.minigame).toEqual({
      prompt: 'Tap the golden snitch game',
      url: 'https://example.com/game.html',
    });
  });

  it('解析多个角色', () => {
    const text = `characters:
  - hero
  - villain
  - npc_guard`;

    const result = parseSceneMetadata(text);
    expect(result.characters).toEqual(['hero', 'villain', 'npc_guard']);
  });

  it('顶级 url 归入 image', () => {
    const text = `url: https://example.com/scene.webp`;
    const result = parseSceneMetadata(text);
    expect(result.image).toEqual({ url: 'https://example.com/scene.webp' });
  });

  it('空 YAML 返回空对象', () => {
    const result = parseSceneMetadata('');
    expect(result).toEqual({});
  });

  it('无法识别的内容返回空对象', () => {
    const result = parseSceneMetadata('some random text\nno yaml here');
    expect(result).toEqual({});
  });

  it('处理包含空行的 YAML', () => {
    const text = `image:
  prompt: A dark forest

audio:
  type: background_music
  prompt: Eerie ambient sounds`;

    const result = parseSceneMetadata(text);
    expect(result.image?.prompt).toBe('A dark forest');
    expect(result.audio?.prompt).toBe('Eerie ambient sounds');
  });
});

describe('parseSceneMetadata（js-yaml 优先）', () => {
  it('带引号的值解引号', () => {
    const result = parseSceneMetadata(`image:\n  aspectRatio: '16:9'`);
    expect(result.image?.aspectRatio).toBe('16:9');
  });

  it('块标量多行 prompt', () => {
    const result = parseSceneMetadata(`image:\n  prompt: |-\n    line1\n    line2`);
    expect(result.image?.prompt).toBe('line1\nline2');
  });

  it('flow 风格 section', () => {
    const result = parseSceneMetadata(`image: {prompt: A castle}`);
    expect(result.image).toEqual({ prompt: 'A castle' });
  });

  it('flow 风格 characters', () => {
    const result = parseSceneMetadata(`characters: [hero, villain]`);
    expect(result.characters).toEqual(['hero', 'villain']);
  });

  it('数字值转字符串', () => {
    const result = parseSceneMetadata(`image:\n  aspectRatio: 1.78\ncharacters: [123, hero]`);
    expect(result.image?.aspectRatio).toBe('1.78');
    expect(result.characters).toEqual(['123', 'hero']);
  });

  it('未知顶层键不进 metadata；纯未知键块返回空对象', () => {
    const mixed = parseSceneMetadata(`meta:\n  chapter: 1\nimage:\n  prompt: x`);
    expect(mixed).toEqual({ image: { prompt: 'x' } });

    const unknownOnly = parseSceneMetadata(`meta:\n  chapter: 1`);
    expect(unknownOnly).toEqual({});
  });

  it('残缺 yaml 回落行级容错解析', () => {
    const result = parseSceneMetadata(`image:\n  prompt: [unclosed`);
    expect(result.image?.prompt).toBe('[unclosed');
  });

  it('重复顶层键回落行级解析（后值胜出）', () => {
    const result = parseSceneMetadata(`image:\n  prompt: first\nimage:\n  prompt: second`);
    expect(result.image?.prompt).toBe('second');
  });
});

describe('hasMetadataContent', () => {
  it('有 image 时返回 true', () => {
    expect(hasMetadataContent({ image: { prompt: 'test' } })).toBe(true);
  });

  it('有 characters 时返回 true', () => {
    expect(hasMetadataContent({ characters: ['hero'] })).toBe(true);
  });

  it('空 characters 数组返回 false', () => {
    expect(hasMetadataContent({ characters: [] })).toBe(false);
  });

  it('完全空返回 false', () => {
    expect(hasMetadataContent({})).toBe(false);
  });
});

describe('serializeSceneMetadata', () => {
  it('序列化完整元数据', () => {
    const text = serializeSceneMetadata({
      image: { prompt: 'A castle', url: 'https://example.com/castle.webp' },
      audio: { type: 'background_music', prompt: 'Epic music' },
      characters: ['hero', 'villain'],
    });
    expect(text).toContain('image:');
    expect(text).toContain('  prompt: A castle');
    expect(text).toContain('  url: https://example.com/castle.webp');
    expect(text).toContain('audio:');
    expect(text).toContain('  type: background_music');
    expect(text).toContain('characters:');
    expect(text).toContain('  - hero');
    expect(text).toContain('  - villain');
  });

  it('序列化后可以被解析回来', () => {
    const original = {
      image: { prompt: 'Night time scene', url: 'https://example.com/img.webp', aspectRatio: '16:9' },
      audio: { type: 'sfx', prompt: 'Thunder' },
      video: { prompt: 'Door opening', url: 'https://example.com/v.mp4' },
      minigame: { prompt: 'Tap game' },
      characters: ['npc_a', 'npc_b'],
    };
    const text = serializeSceneMetadata(original);
    const parsed = parseSceneMetadata(text);
    expect(parsed.image).toEqual(original.image);
    expect(parsed.audio).toEqual(original.audio);
    expect(parsed.video).toEqual(original.video);
    expect(parsed.minigame).toEqual(original.minigame);
    expect(parsed.characters).toEqual(original.characters);
  });

  it('空元数据生成空字符串', () => {
    expect(serializeSceneMetadata({})).toBe('');
  });

  it('跳过 undefined 字段', () => {
    const text = serializeSceneMetadata({ image: { prompt: 'Test' } });
    expect(text).toBe('image:\n  prompt: Test');
    expect(text).not.toContain('url');
  });
});

describe('serializeSceneMetadata（round-trip 保留未知键）', () => {
  it('保留 minigame.variables', () => {
    const original = `minigame:
  prompt: 打地鼠
  url: https://example.com/game.html
  variables:
    score: points
    time: seconds`;
    const output = serializeSceneMetadata(
      { minigame: { prompt: '新玩法', url: 'https://example.com/game.html' } },
      original,
    );
    const loaded = yaml.load(output) as { minigame: Record<string, unknown> };
    expect(loaded.minigame.variables).toEqual({ score: 'points', time: 'seconds' });
    expect(loaded.minigame.prompt).toBe('新玩法');
  });

  it('保留 image.character 与 image.characters', () => {
    const original = `image:
  prompt: 车站
  character: liu_quan
  characters:
    - liu_quan
    - wang_hua`;
    const output = serializeSceneMetadata({ image: { prompt: '新车站' } }, original);
    const loaded = yaml.load(output) as { image: Record<string, unknown> };
    expect(loaded.image.character).toBe('liu_quan');
    expect(loaded.image.characters).toEqual(['liu_quan', 'wang_hua']);
    expect(loaded.image.prompt).toBe('新车站');
  });

  it('保留未知顶层键且值类型不变', () => {
    const original = `image:
  prompt: 旧
meta:
  chapter: 1`;
    const output = serializeSceneMetadata({ image: { prompt: '新' } }, original);
    expect(output).toContain('chapter: 1');
    const loaded = yaml.load(output) as { meta: { chapter: number } };
    expect(loaded.meta.chapter).toBe(1);
  });

  it('表单清空的字段删除对应键，邻居保留', () => {
    const original = `image:
  prompt: 描述
  url: https://example.com/a.png
  aspectRatio: '16:9'`;
    const output = serializeSceneMetadata({ image: { prompt: '描述', url: undefined, aspectRatio: '16:9' } }, original);
    const loaded = yaml.load(output) as { image: Record<string, unknown> };
    expect('url' in loaded.image).toBe(false);
    expect(loaded.image.prompt).toBe('描述');
    expect(loaded.image.aspectRatio).toBe('16:9');
  });

  it('characters 空数组删除、undefined 保留基底', () => {
    const original = `characters:
  - hero
image:
  prompt: x`;
    const cleared = serializeSceneMetadata({ characters: [] }, original);
    expect(yaml.load(cleared)).not.toHaveProperty('characters');

    const untouched = serializeSceneMetadata({ image: { prompt: '新' } }, original);
    expect((yaml.load(untouched) as { characters: string[] }).characters).toEqual(['hero']);
  });

  it('meta 未触及的 section 原样保留', () => {
    const original = `audio:
  type: bgm
  prompt: 雨声
image:
  prompt: 旧`;
    const output = serializeSceneMetadata({ image: { prompt: '新' } }, original);
    const loaded = yaml.load(output) as { audio: Record<string, unknown> };
    expect(loaded.audio).toEqual({ type: 'bgm', prompt: '雨声' });
  });

  it('残缺基底回落为空基底，表单字段照常写出', () => {
    const output = serializeSceneMetadata({ image: { prompt: '新' } }, 'image: [broken\n  oops');
    expect(yaml.load(output)).toEqual({ image: { prompt: '新' } });
  });

  it('顶级 url 迁移进 image 不双写', () => {
    const original = `url: https://example.com/a.png
meta:
  chapter: 2`;
    const output = serializeSceneMetadata({ image: { url: 'https://example.com/a.png', prompt: '新' } }, original);
    const loaded = yaml.load(output) as {
      url?: unknown;
      image: Record<string, unknown>;
      meta: Record<string, unknown>;
    };
    expect(loaded.url).toBeUndefined();
    expect(loaded.image.url).toBe('https://example.com/a.png');
    expect(loaded.meta.chapter).toBe(2);
  });

  it('空 section 输出裸键且可被解析回来', () => {
    const output = serializeSceneMetadata({ video: { prompt: undefined, url: undefined } }, '');
    expect(output).toBe('video:');
    expect(parseSceneMetadata(output).video).toBeDefined();
  });

  it('多行 prompt round-trip 保持原值', () => {
    const output = serializeSceneMetadata({ image: { prompt: 'line1\nline2' } }, '');
    expect(parseSceneMetadata(output).image?.prompt).toBe('line1\nline2');
  });

  it('含冒号等特殊字符的值 round-trip 后仍是合法 yaml', () => {
    const output = serializeSceneMetadata({ image: { prompt: 'Note: dark alley', aspectRatio: '16:9' } }, '');
    expect(() => yaml.load(output)).not.toThrow();
    const parsed = parseSceneMetadata(output);
    expect(parsed.image?.prompt).toBe('Note: dark alley');
    expect(parsed.image?.aspectRatio).toBe('16:9');
  });

  it('序列化是幂等的', () => {
    const original = `minigame:
  prompt: 打地鼠
  variables:
    score: points
meta:
  chapter: 3`;
    const meta = { minigame: { prompt: '打地鼠' } };
    const once = serializeSceneMetadata(meta, original);
    const twice = serializeSceneMetadata(meta, once);
    expect(twice).toBe(once);
  });
});
