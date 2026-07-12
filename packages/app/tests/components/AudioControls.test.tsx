import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AudioControls from '@/components/game-player/AudioControls';
import type { UseAudioPlayerReturn } from '@/components/game-player/useAudioPlayer';

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

describe('AudioControls', () => {
  it('hasAudio 为 false 时不渲染任何内容', () => {
    const { container } = render(
      <AudioControls
        audioPlayer={fakeAudioPlayer()}
        hasAudio={false}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('播放中显示暂停图标和状态文字', () => {
    render(
      <AudioControls
        audioPlayer={fakeAudioPlayer({ isPlaying: true })}
        hasAudio={true}
      />,
    );

    expect(screen.getByTitle('暂停')).toBeInTheDocument();
    expect(screen.getByText('正在播放...')).toBeInTheDocument();
  });

  it('暂停中显示继续图标和状态文字', () => {
    render(
      <AudioControls
        audioPlayer={fakeAudioPlayer({ isPaused: true })}
        hasAudio={true}
      />,
    );

    expect(screen.getByTitle('继续')).toBeInTheDocument();
    expect(screen.getByText('已暂停')).toBeInTheDocument();
  });

  it('既未播放也未暂停时显示"播放"，无状态文字', () => {
    render(
      <AudioControls
        audioPlayer={fakeAudioPlayer()}
        hasAudio={true}
      />,
    );

    expect(screen.getByTitle('播放')).toBeInTheDocument();
    expect(screen.queryByText('正在播放...')).not.toBeInTheDocument();
    expect(screen.queryByText('已暂停')).not.toBeInTheDocument();
  });

  it('点击播放/暂停按钮调用 toggle()', () => {
    const audioPlayer = fakeAudioPlayer();
    render(
      <AudioControls
        audioPlayer={audioPlayer}
        hasAudio={true}
      />,
    );

    fireEvent.click(screen.getByTitle('播放'));

    expect(audioPlayer.toggle).toHaveBeenCalledTimes(1);
  });

  it('点击重播按钮调用 replay()', () => {
    const audioPlayer = fakeAudioPlayer();
    render(
      <AudioControls
        audioPlayer={audioPlayer}
        hasAudio={true}
      />,
    );

    fireEvent.click(screen.getByTitle('重播'));

    expect(audioPlayer.replay).toHaveBeenCalledTimes(1);
  });
});
