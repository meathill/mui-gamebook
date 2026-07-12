import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { UseAudioPlayerReturn } from '@mui-gamebook/app/hooks/useAudioPlayer';
import AudioControls from './AudioControls';

function fakeAudioPlayer(overrides: Partial<UseAudioPlayerReturn> = {}): UseAudioPlayerReturn {
  return {
    isPlaying: false,
    isPaused: false,
    play: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    stop: vi.fn(),
    replay: vi.fn(),
    toggle: vi.fn(),
    ...overrides,
  };
}

describe('AudioControls (jianjian)', () => {
  it('播放中显示暂停图标和状态文字', () => {
    render(<AudioControls audioPlayer={fakeAudioPlayer({ isPlaying: true })} />);

    expect(screen.getByTitle('暂停')).toHaveTextContent('⏸️');
    expect(screen.getByText('正在播放...')).toBeInTheDocument();
  });

  it('暂停中显示继续标题和状态文字', () => {
    render(<AudioControls audioPlayer={fakeAudioPlayer({ isPaused: true })} />);

    expect(screen.getByTitle('继续')).toHaveTextContent('▶️');
    expect(screen.getByText('已暂停')).toBeInTheDocument();
  });

  it('既未播放也未暂停时显示"播放"标题，无状态文字', () => {
    const { container } = render(<AudioControls audioPlayer={fakeAudioPlayer()} />);

    expect(screen.getByTitle('播放')).toBeInTheDocument();
    expect(container.querySelector('.text-foreground\\/40')).toHaveTextContent('');
  });

  it('点击播放/暂停按钮调用 toggle()', () => {
    const audioPlayer = fakeAudioPlayer();
    render(<AudioControls audioPlayer={audioPlayer} />);

    fireEvent.click(screen.getByTitle('播放'));

    expect(audioPlayer.toggle).toHaveBeenCalledTimes(1);
  });

  it('点击重播按钮调用 replay()', () => {
    const audioPlayer = fakeAudioPlayer();
    render(<AudioControls audioPlayer={audioPlayer} />);

    fireEvent.click(screen.getByTitle('重播'));

    expect(audioPlayer.replay).toHaveBeenCalledTimes(1);
  });
});
