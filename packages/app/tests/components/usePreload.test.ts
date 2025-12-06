import { describe, it, expect } from 'vitest';
import { 
  extractMediaUrls, 
  getNextSceneIds, 
  collectPreloadUrls 
} from '@/components/game-player/usePreload';
import type { PlayableGame, PlayableScene, PlayableSceneNode } from '@mui-gamebook/parser/src/types';

function createMockGame(scenes: Map<string, PlayableScene>): PlayableGame {
  return {
    slug: 'test-game',
    title: '测试游戏',
    initialState: {},
    scenes,
    startSceneId: 'start',
  };
}

describe('extractMediaUrls', () => {
  it('应该从节点中提取图片 URL', () => {
    const nodes: PlayableSceneNode[] = [
      { type: 'static_image', url: 'https://example.com/a.jpg' },
      { type: 'ai_image', url: 'https://example.com/b.png' },
    ];
    
    const urls = extractMediaUrls(nodes);
    expect(urls).toEqual([
      'https://example.com/a.jpg',
      'https://example.com/b.png',
    ]);
  });

  it('应该从节点中提取音频 URL', () => {
    const nodes: PlayableSceneNode[] = [
      { type: 'static_audio', url: 'https://example.com/a.mp3' },
      { type: 'ai_audio', audioType: 'sfx', url: 'https://example.com/b.wav' },
    ];
    
    const urls = extractMediaUrls(nodes);
    expect(urls).toEqual([
      'https://example.com/a.mp3',
      'https://example.com/b.wav',
    ]);
  });

  it('应该从节点中提取视频 URL', () => {
    const nodes: PlayableSceneNode[] = [
      { type: 'static_video', url: 'https://example.com/a.mp4' },
      { type: 'ai_video', url: 'https://example.com/b.webm' },
    ];
    
    const urls = extractMediaUrls(nodes);
    expect(urls).toEqual([
      'https://example.com/a.mp4',
      'https://example.com/b.webm',
    ]);
  });

  it('应该跳过没有 URL 的节点', () => {
    const nodes: PlayableSceneNode[] = [
      { type: 'ai_image' }, // 没有 URL
      { type: 'static_image', url: 'https://example.com/valid.jpg' },
    ];
    
    const urls = extractMediaUrls(nodes);
    expect(urls).toEqual(['https://example.com/valid.jpg']);
  });

  it('应该跳过非媒体节点', () => {
    const nodes: PlayableSceneNode[] = [
      { type: 'text', content: '文本内容' },
      { type: 'choice', text: '选项', nextSceneId: 'next' },
      { type: 'static_image', url: 'https://example.com/img.jpg' },
    ];
    
    const urls = extractMediaUrls(nodes);
    expect(urls).toEqual(['https://example.com/img.jpg']);
  });
});

describe('getNextSceneIds', () => {
  it('应该从选项中提取下一个场景 ID', () => {
    const scene: PlayableScene = {
      id: 'start',
      nodes: [
        { type: 'text', content: '开始' },
        { type: 'choice', text: '去A', nextSceneId: 'scene-a' },
        { type: 'choice', text: '去B', nextSceneId: 'scene-b' },
      ],
    };
    
    const ids = getNextSceneIds(scene);
    expect(ids).toEqual(['scene-a', 'scene-b']);
  });

  it('应该去重相同的场景 ID', () => {
    const scene: PlayableScene = {
      id: 'start',
      nodes: [
        { type: 'choice', text: '选项1', nextSceneId: 'same' },
        { type: 'choice', text: '选项2', nextSceneId: 'same' },
      ],
    };
    
    const ids = getNextSceneIds(scene);
    expect(ids).toEqual(['same']);
  });

  it('应该返回空数组当没有选项时', () => {
    const scene: PlayableScene = {
      id: 'end',
      nodes: [
        { type: 'text', content: '结束' },
      ],
    };
    
    const ids = getNextSceneIds(scene);
    expect(ids).toEqual([]);
  });
});

describe('collectPreloadUrls', () => {
  it('应该收集下一个场景的媒体 URL', () => {
    const scenes = new Map<string, PlayableScene>([
      ['start', {
        id: 'start',
        nodes: [
          { type: 'choice', text: '去A', nextSceneId: 'scene-a' },
        ],
      }],
      ['scene-a', {
        id: 'scene-a',
        nodes: [
          { type: 'static_image', url: 'https://example.com/a.jpg' },
        ],
      }],
    ]);

    const game = createMockGame(scenes);
    const processedScenes = new Set<string>();
    const preloadedUrls = new Set<string>();
    
    const urls = collectPreloadUrls(game, 'start', processedScenes, preloadedUrls);
    expect(urls).toEqual(['https://example.com/a.jpg']);
  });

  it('应该跳过已处理的场景', () => {
    const scenes = new Map<string, PlayableScene>([
      ['start', {
        id: 'start',
        nodes: [
          { type: 'choice', text: '去A', nextSceneId: 'scene-a' },
        ],
      }],
      ['scene-a', {
        id: 'scene-a',
        nodes: [
          { type: 'static_image', url: 'https://example.com/a.jpg' },
        ],
      }],
    ]);

    const game = createMockGame(scenes);
    const processedScenes = new Set<string>(['start']); // 已处理
    const preloadedUrls = new Set<string>();
    
    const urls = collectPreloadUrls(game, 'start', processedScenes, preloadedUrls);
    expect(urls).toEqual([]);
  });

  it('应该跳过已预加载的 URL', () => {
    const scenes = new Map<string, PlayableScene>([
      ['start', {
        id: 'start',
        nodes: [
          { type: 'choice', text: '去A', nextSceneId: 'scene-a' },
        ],
      }],
      ['scene-a', {
        id: 'scene-a',
        nodes: [
          { type: 'static_image', url: 'https://example.com/a.jpg' },
          { type: 'static_image', url: 'https://example.com/b.jpg' },
        ],
      }],
    ]);

    const game = createMockGame(scenes);
    const processedScenes = new Set<string>();
    const preloadedUrls = new Set<string>(['https://example.com/a.jpg']); // 已预加载
    
    const urls = collectPreloadUrls(game, 'start', processedScenes, preloadedUrls);
    expect(urls).toEqual(['https://example.com/b.jpg']);
  });

  it('应该去重相同的 URL', () => {
    const scenes = new Map<string, PlayableScene>([
      ['start', {
        id: 'start',
        nodes: [
          { type: 'choice', text: '去A', nextSceneId: 'scene-a' },
          { type: 'choice', text: '去B', nextSceneId: 'scene-b' },
        ],
      }],
      ['scene-a', {
        id: 'scene-a',
        nodes: [
          { type: 'static_image', url: 'https://example.com/same.jpg' },
        ],
      }],
      ['scene-b', {
        id: 'scene-b',
        nodes: [
          { type: 'static_image', url: 'https://example.com/same.jpg' },
        ],
      }],
    ]);

    const game = createMockGame(scenes);
    const processedScenes = new Set<string>();
    const preloadedUrls = new Set<string>();
    
    const urls = collectPreloadUrls(game, 'start', processedScenes, preloadedUrls);
    expect(urls).toEqual(['https://example.com/same.jpg']);
  });

  it('应该处理不存在的场景', () => {
    const scenes = new Map<string, PlayableScene>();
    const game = createMockGame(scenes);
    const processedScenes = new Set<string>();
    const preloadedUrls = new Set<string>();
    
    const urls = collectPreloadUrls(game, 'non-existent', processedScenes, preloadedUrls);
    expect(urls).toEqual([]);
  });
});
