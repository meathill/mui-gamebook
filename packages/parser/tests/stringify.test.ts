import { describe, it, expect } from 'vitest';
import { Game, SceneNode } from '../src/types';
import { stringify } from '../src/index'; // stringify will be added to index.ts

describe('stringify', () => {
  it('should correctly stringify a minimal Game object', () => {
    const game: Game = {
      title: 'Minimal Game',
      description: 'A very simple game for testing.',
      initialState: {},
      ai: {},
      scenes: new Map([['start', { id: 'start', nodes: [{ type: 'text', content: 'Welcome!' }] }]]),
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
      scenes: new Map([['start', { id: 'start', nodes: [{ type: 'text', content: 'Start here.' }] }]]),
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
      title: 'Complex Scene',
      initialState: { has_key: false },
      ai: {},
      scenes: new Map([
        [
          'main',
          {
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
        ],
      ]),
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
      title: 'Minigame Test',
      initialState: { snitch_caught: 0 },
      ai: {},
      scenes: new Map([
        [
          'start',
          {
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
        ],
      ]),
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
});
