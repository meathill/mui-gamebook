import { describe, it, expect } from 'vitest';
import { Game, SceneNode } from '../src/types';
import { stringify } from '../src/index'; // stringify will be added to index.ts

describe('stringify', () => {
  it('should correctly stringify a minimal Game object', () => {
    const game: Game = {
      slug: 'minimal-game',
      title: 'Minimal Game',
      description: 'A very simple game for testing.',
      initialState: {},
      ai: {},
      scenes: { start: { id: 'start', nodes: [{ type: 'text', content: 'Welcome!' }] } },
    };

    const expected = `---
title: Minimal Game
description: A very simple game for testing.
---

# start
Welcome!`;
    const result = stringify(game);
    expect(result.trim()).toBe(expected.trim());
  });

  it('should correctly stringify a Game object with full metadata and state', () => {
    const game: Game = {
      slug: 'full-meta-game',
      title: 'Full Meta Game',
      description: 'Game with all metadata, state, and AI config.',
      cover_image: 'http://example.com/cover.jpg',
      tags: ['test', 'full'],
      initialState: {
        health: 100,
        has_sword: true,
      },
      ai: {
        style: {
          image: 'cartoon',
        },
        characters: {
          hero: { name: 'Hero', image_prompt: 'a brave hero' },
        },
      },
      scenes: { start: { id: 'start', nodes: [{ type: 'text', content: 'Start here.' }] } },
    };

    const expected = `---
title: Full Meta Game
description: Game with all metadata, state, and AI config.
cover_image: http://example.com/cover.jpg
tags:
  - test
  - full
state:
  health: 100
  has_sword: true
ai:
  style:
    image: cartoon
  characters:
    hero:
      name: Hero
      image_prompt: a brave hero
---

# start
Start here.`;

    const result = stringify(game);
    expect(result.trim()).toBe(expected.trim());
  });

  it('should correctly stringify a scene with various node types', () => {
    const game: Game = {
      slug: 'complex-scene',
      title: 'Complex Scene',
      initialState: { has_key: false },
      ai: {},
      scenes: {
        main: {
          id: 'main',
          nodes: [
            { type: 'text', content: 'A mysterious door stands before you.' },
            { type: 'static_image', alt: 'Mysterious Door', url: 'http://example.com/door.jpg' },
            { type: 'choice', text: 'Open the door', nextSceneId: 'inside', condition: 'has_key == true' },
            { type: 'choice', text: 'Knock on the door', nextSceneId: 'knock', set: 'tries = tries + 1' },
            { type: 'ai_image', prompt: 'a glowing key', character: 'player', url: 'http://ai.com/key.png' },
            { type: 'ai_audio', audioType: 'sfx', prompt: 'eerie sound', url: 'http://ai.com/sound.mp3' },
            { type: 'ai_video', prompt: 'door opening animation', url: 'http://ai.com/video.mp4' },
            { type: 'text', content: 'What will you do?' },
          ],
        },
      },
    };

    const expected = `---
title: Complex Scene
state:
  has_key: false
---

# main
A mysterious door stands before you.
![Mysterious Door](http://example.com/door.jpg)
* [Open the door] -> inside (if: has_key == true)
* [Knock on the door] -> knock (set: tries = tries + 1)
\`\`\`image-gen
prompt: a glowing key
character: player
url: http://ai.com/key.png
\`\`\`
\`\`\`audio-gen
type: sfx
prompt: eerie sound
url: http://ai.com/sound.mp3
\`\`\`
\`\`\`video-gen
prompt: door opening animation
url: http://ai.com/video.mp4
\`\`\`
What will you do?`;

    const result = stringify(game);
    expect(result.trim()).toBe(expected.trim());
  });

  it('should correctly stringify a minigame node', () => {
    const game: Game = {
      slug: 'minigame-test',
      title: 'Minigame Test',
      initialState: { snitch_caught: 0 },
      ai: {},
      scenes: {
        start: {
          id: 'start',
          nodes: [
            { type: 'text', content: '魁地奇比赛开始了！' },
            {
              type: 'minigame',
              prompt: '创建一个点击金色飞贼的游戏',
              variables: { snitch_caught: '捕获的飞贼数量' },
              url: 'https://example.com/minigames/1',
            },
            { type: 'choice', text: '比赛结束', nextSceneId: 'result', condition: 'snitch_caught >= 10' },
          ],
        },
      },
    };

    const expected = `---
title: Minigame Test
state:
  snitch_caught: 0
---

# start
魁地奇比赛开始了！
\`\`\`minigame-gen
prompt: 创建一个点击金色飞贼的游戏
variables:
  - snitch_caught: 捕获的飞贼数量
url: https://example.com/minigames/1
\`\`\`
* [比赛结束] -> result (if: snitch_caught >= 10)`;

    const result = stringify(game);
    expect(result.trim()).toBe(expected.trim());
  });

  it('should correctly stringify text nodes with audio_url before the content', () => {
    const game: Game = {
      slug: 'audio-test',
      title: 'Audio Test',
      initialState: {},
      ai: {},
      scenes: {
        start: {
          id: 'start',
          nodes: [
            { type: 'text', content: '妈妈说了一些话。', audio_url: 'https://example.com/audio.wav' },
            { type: 'text', content: '没有语音的文本。' },
          ],
        },
      },
    };

    const expected = `---
title: Audio Test
---

# start
<!-- audio: https://example.com/audio.wav -->
妈妈说了一些话。
没有语音的文本。`;

    const result = stringify(game);
    expect(result.trim()).toBe(expected.trim());
  });

  it('should correctly stringify choice nodes with audio_url', () => {
    const game: Game = {
      slug: 'choice-audio-test',
      title: 'Choice Audio Test',
      initialState: {},
      ai: {},
      scenes: {
        start: {
          id: 'start',
          nodes: [
            { type: 'text', content: '选择一个选项' },
            { type: 'choice', text: '选项一', nextSceneId: 'next', audio_url: 'https://example.com/choice.wav' },
          ],
        },
      },
    };

    const result = stringify(game);
    expect(result).toContain('* [选项一] -> next (audio: https://example.com/choice.wav)');
  });

  it('should correctly stringify cover_prompt and cover_aspect_ratio', () => {
    const game: Game = {
      slug: 'cover-info-test',
      title: 'Cover Info Test',
      cover_image: 'https://example.com/cover.png',
      cover_prompt: '一个幻想风格的城堡',
      cover_aspect_ratio: '3:2',
      initialState: {},
      ai: {},
      scenes: { start: { id: 'start', nodes: [{ type: 'text', content: 'Welcome!' }] } },
    };

    const result = stringify(game);
    expect(result).toContain('cover_image: https://example.com/cover.png');
    expect(result).toContain('cover_prompt: 一个幻想风格的城堡');
    expect(result).toContain("cover_aspect_ratio: '3:2'");
  });
});
