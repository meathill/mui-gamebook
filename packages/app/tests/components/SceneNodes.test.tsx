import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { PlayableSceneNode } from '@mui-gamebook/parser/src/types';
import SceneNodes from '@/components/game-player/SceneNodes';
import type { UseAudioPlayerReturn } from '@/components/game-player/useAudioPlayer';

vi.mock('@/components/game-player/MiniGamePlayer', () => ({
  default: (props: { url: string }) => <div data-testid="minigame-player">{props.url}</div>,
}));

function fakeAudioPlayer(overrides: Partial<UseAudioPlayerReturn> = {}): UseAudioPlayerReturn {
  return {
    isPlaying: false,
    isPaused: false,
    currentUrl: null,
    play: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    stop: vi.fn(),
    replay: vi.fn(),
    toggle: vi.fn(),
    ...overrides,
  };
}

function baseProps(overrides: Partial<React.ComponentProps<typeof SceneNodes>> = {}) {
  return {
    nodes: [] as PlayableSceneNode[],
    runtimeState: {},
    hasMinigame: false,
    minigameCompleted: false,
    hasReadAll: true,
    hasImage: false,
    audioPlayer: fakeAudioPlayer(),
    onChoice: vi.fn(),
    onMiniGameComplete: vi.fn(),
    ...overrides,
  };
}

describe('SceneNodes', () => {
  it('text 节点渲染插值后的 markdown 内容', () => {
    render(
      <SceneNodes
        {...baseProps({
          nodes: [{ type: 'text', content: '你有 {{gold}} 金币' }],
          runtimeState: { gold: 10 },
        })}
      />,
    );

    expect(screen.getByText('你有 10 金币')).toBeInTheDocument();
  });

  it('text 节点带 audio_url 时渲染 AudioControls', () => {
    render(
      <SceneNodes
        {...baseProps({
          nodes: [{ type: 'text', content: '旁白', audio_url: 'https://x.com/a.mp3' }],
        })}
      />,
    );

    expect(screen.getByTitle('播放')).toBeInTheDocument();
  });

  it('text 节点无 audio_url 时不渲染 AudioControls', () => {
    render(
      <SceneNodes
        {...baseProps({
          nodes: [{ type: 'text', content: '旁白' }],
        })}
      />,
    );

    expect(screen.queryByTitle('播放')).not.toBeInTheDocument();
  });

  it('static_image/ai_image 节点不渲染任何内容', () => {
    const { container } = render(
      <SceneNodes
        {...baseProps({
          nodes: [
            { type: 'static_image', url: 'https://x.com/a.png' },
            { type: 'ai_image', url: 'https://x.com/b.png' },
          ],
        })}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('minigame 节点没有 url 时不渲染，有 url 时渲染 MiniGamePlayer', () => {
    const { rerender, container } = render(<SceneNodes {...baseProps({ nodes: [{ type: 'minigame' }] })} />);
    expect(container).toBeEmptyDOMElement();

    rerender(<SceneNodes {...baseProps({ nodes: [{ type: 'minigame', url: 'https://x.com/game.js' }] })} />);
    expect(screen.getByTestId('minigame-player')).toHaveTextContent('https://x.com/game.js');
  });

  it('choice 节点在 hasMinigame 且未完成时隐藏', () => {
    const { container } = render(
      <SceneNodes
        {...baseProps({
          nodes: [{ type: 'choice', text: '继续', nextSceneId: 'scene2' }],
          hasMinigame: true,
          minigameCompleted: false,
        })}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('choice 节点 condition 不满足时隐藏', () => {
    const { container } = render(
      <SceneNodes
        {...baseProps({
          nodes: [{ type: 'choice', text: '继续', nextSceneId: 'scene2', condition: 'has_key == true' }],
          runtimeState: { has_key: false },
        })}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('移动端（hasImage 且未读完全部内容）时 choice 隐藏，桌面端（无图）始终显示', () => {
    const { container, rerender } = render(
      <SceneNodes
        {...baseProps({
          nodes: [{ type: 'choice', text: '继续', nextSceneId: 'scene2' }],
          hasImage: true,
          hasReadAll: false,
        })}
      />,
    );
    expect(container).toBeEmptyDOMElement();

    rerender(
      <SceneNodes
        {...baseProps({
          nodes: [{ type: 'choice', text: '继续', nextSceneId: 'scene2' }],
          hasImage: false,
          hasReadAll: false,
        })}
      />,
    );
    expect(screen.getByText('继续')).toBeInTheDocument();
  });

  it('点击 choice 按钮调用 onChoice，携带 nextSceneId/set/index', () => {
    const onChoice = vi.fn();
    render(
      <SceneNodes
        {...baseProps({
          nodes: [{ type: 'choice', text: '拿走钥匙', nextSceneId: 'scene3', set: 'has_key = true' }],
          onChoice,
        })}
      />,
    );

    fireEvent.click(screen.getByText('拿走钥匙'));

    expect(onChoice).toHaveBeenCalledWith('scene3', 'has_key = true', 0);
  });

  it('choice 带 audio_url 时点击喇叭按钮播放语音且不触发 onChoice', () => {
    const onChoice = vi.fn();
    const audioPlayer = fakeAudioPlayer();
    render(
      <SceneNodes
        {...baseProps({
          nodes: [{ type: 'choice', text: '拿走钥匙', nextSceneId: 'scene3', audio_url: 'https://x.com/c.mp3' }],
          onChoice,
          audioPlayer,
        })}
      />,
    );

    fireEvent.click(screen.getByTitle('播放语音'));

    expect(audioPlayer.play).toHaveBeenCalledWith('https://x.com/c.mp3');
    expect(onChoice).not.toHaveBeenCalled();
  });

  it('未知节点类型不渲染任何内容', () => {
    const { container } = render(
      <SceneNodes {...baseProps({ nodes: [{ type: 'static_audio', url: 'https://x.com/a.mp3' }] })} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
