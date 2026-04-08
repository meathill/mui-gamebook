import { describe, it, expect } from 'vitest';
import { parseSceneMetadata, hasMetadataContent } from '@/lib/editor/extensions/matchers';

describe('parseSceneMetadata', () => {
  it('解析完整的场景元数据', () => {
    const yaml = `image:
  prompt: Night time, Zhumadian long distance bus station
characters:
  - liu_quan
url: https://i.muistory.com/images/scene_start.webp
audio:
  type: background_music
  prompt: City noise, cold wind, distant traffic`;

    const result = parseSceneMetadata(yaml);
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
    const yaml = `image:
  prompt: A castle in clouds
  url: https://example.com/castle.webp
  aspectRatio: 16:9`;

    const result = parseSceneMetadata(yaml);
    expect(result.image).toEqual({
      prompt: 'A castle in clouds',
      url: 'https://example.com/castle.webp',
      aspectRatio: '16:9',
    });
    expect(result.audio).toBeUndefined();
    expect(result.characters).toBeUndefined();
  });

  it('解析只有 audio 的 YAML', () => {
    const yaml = `audio:
  type: sfx
  prompt: Thunder and rain
  url: https://example.com/thunder.mp3`;

    const result = parseSceneMetadata(yaml);
    expect(result.audio).toEqual({
      type: 'sfx',
      prompt: 'Thunder and rain',
      url: 'https://example.com/thunder.mp3',
    });
    expect(result.image).toBeUndefined();
  });

  it('解析 video 元数据', () => {
    const yaml = `video:
  prompt: Door opening slowly
  url: https://example.com/door.mp4`;

    const result = parseSceneMetadata(yaml);
    expect(result.video).toEqual({
      prompt: 'Door opening slowly',
      url: 'https://example.com/door.mp4',
    });
  });

  it('解析 minigame 元数据', () => {
    const yaml = `minigame:
  prompt: Tap the golden snitch game
  url: https://example.com/game.html`;

    const result = parseSceneMetadata(yaml);
    expect(result.minigame).toEqual({
      prompt: 'Tap the golden snitch game',
      url: 'https://example.com/game.html',
    });
  });

  it('解析多个角色', () => {
    const yaml = `characters:
  - hero
  - villain
  - npc_guard`;

    const result = parseSceneMetadata(yaml);
    expect(result.characters).toEqual(['hero', 'villain', 'npc_guard']);
  });

  it('顶级 url 归入 image', () => {
    const yaml = `url: https://example.com/scene.webp`;
    const result = parseSceneMetadata(yaml);
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
    const yaml = `image:
  prompt: A dark forest

audio:
  type: background_music
  prompt: Eerie ambient sounds`;

    const result = parseSceneMetadata(yaml);
    expect(result.image?.prompt).toBe('A dark forest');
    expect(result.audio?.prompt).toBe('Eerie ambient sounds');
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
