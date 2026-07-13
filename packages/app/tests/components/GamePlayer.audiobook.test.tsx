import { act, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { Theme } from '@radix-ui/themes';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlayableGame } from '@mui-gamebook/parser/src/types';
import GamePlayer from '@/components/GamePlayer';
import { DialogProvider } from '@/components/Dialog';
import messages from '../../src/i18n/messages/en.json';

window.scrollTo = vi.fn();

// 跟 tests/hooks/useAudioPlayer.gamePlayer.test.ts 同款：jsdom 的 HTMLMediaElement
// 是桩实现，用一个有状态的假 Audio 类替代全局构造函数，手动触发 onended 模拟播放结束
class FakeAudio {
  paused = true;
  currentTime = 0;
  duration = 100;
  src: string;
  onplay: (() => void) | null = null;
  onpause: (() => void) | null = null;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  play = vi.fn(() => {
    this.paused = false;
    return Promise.resolve();
  });
  pause = vi.fn(() => {
    this.paused = true;
  });

  constructor(src = '') {
    this.src = src;
  }
}

let instances: FakeAudio[] = [];
const fetchMock = vi.fn<typeof fetch>();

function renderWithProviders(component: React.ReactElement) {
  return render(
    <Theme>
      <NextIntlClientProvider
        messages={messages}
        locale="en">
        <DialogProvider>{component}</DialogProvider>
      </NextIntlClientProvider>
    </Theme>,
  );
}

const mockGame: PlayableGame = {
  slug: 'test-game',
  title: 'Test Adventure',
  initialState: {},
  startSceneId: 'start',
  scenes: {
    start: {
      id: 'start',
      nodes: [
        { type: 'text', content: 'Hello.' },
        { type: 'choice', text: 'Go', nextSceneId: 'end' },
      ],
    },
    end: {
      id: 'end',
      nodes: [{ type: 'text', content: 'The end.' }],
    },
  },
};

describe('GamePlayer 有声书播放', () => {
  beforeEach(() => {
    instances = [];
    vi.stubGlobal(
      'Audio',
      vi.fn().mockImplementation(function (src?: string) {
        const instance = new FakeAudio(src);
        instances.push(instance);
        return instance;
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('场景有生成好的有声书时按顺序播放，一句读完（onended）自动播放下一句', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          sceneId: 'start',
          clips: [
            {
              speaker: 'narrator',
              voice: 'mimo_default',
              text: '第一句',
              url: 'https://cdn.x.com/1.wav',
              mimeType: 'audio/wav',
            },
            { speaker: 'mom', voice: '茉莉', text: '第二句', url: 'https://cdn.x.com/2.wav', mimeType: 'audio/wav' },
          ],
        }),
    } as Response);

    renderWithProviders(
      <GamePlayer
        game={mockGame}
        slug="test-game-1"
      />,
    );
    fireEvent.click(screen.getByText('Start Adventure'));

    expect(fetchMock).toHaveBeenCalledWith('/api/games/test-game-1/audiobook/start');
    await vi.waitFor(() => expect(instances).toHaveLength(1), { timeout: 2000 });
    expect(instances[0].src).toBe('https://cdn.x.com/1.wav');

    act(() => instances[0].onended?.());

    await vi.waitFor(() => expect(instances).toHaveLength(2));
    expect(instances[1].src).toBe('https://cdn.x.com/2.wav');
  });

  it('场景没有生成过有声书（404）时回退到旧的单条 audio_url 播放', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404 } as Response);
    const gameWithClassicAudio: PlayableGame = {
      ...mockGame,
      scenes: {
        ...mockGame.scenes,
        start: {
          id: 'start',
          nodes: [
            { type: 'text', content: 'Hello.', audio_url: 'https://cdn.x.com/classic.wav' },
            { type: 'choice', text: 'Go', nextSceneId: 'end' },
          ],
        },
      },
    };

    renderWithProviders(
      <GamePlayer
        game={gameWithClassicAudio}
        slug="test-game-2"
      />,
    );
    fireEvent.click(screen.getByText('Start Adventure'));

    await vi.waitFor(() => expect(instances).toHaveLength(1), { timeout: 2000 });
    expect(instances[0].src).toBe('https://cdn.x.com/classic.wav');
  });

  it('请求有声书接口失败（网络错误）时同样回退到旧的单条 audio_url 播放', async () => {
    fetchMock.mockRejectedValue(new Error('network error'));
    const gameWithClassicAudio: PlayableGame = {
      ...mockGame,
      scenes: {
        ...mockGame.scenes,
        start: {
          id: 'start',
          nodes: [
            { type: 'text', content: 'Hello.', audio_url: 'https://cdn.x.com/classic.wav' },
            { type: 'choice', text: 'Go', nextSceneId: 'end' },
          ],
        },
      },
    };

    renderWithProviders(
      <GamePlayer
        game={gameWithClassicAudio}
        slug="test-game-3"
      />,
    );
    fireEvent.click(screen.getByText('Start Adventure'));

    await vi.waitFor(() => expect(instances).toHaveLength(1), { timeout: 2000 });
    expect(instances[0].src).toBe('https://cdn.x.com/classic.wav');
  });

  it('最后一句播放结束后不会再创建新的 Audio 实例', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          sceneId: 'start',
          clips: [
            {
              speaker: 'narrator',
              voice: 'mimo_default',
              text: '只有一句',
              url: 'https://cdn.x.com/1.wav',
              mimeType: 'audio/wav',
            },
          ],
        }),
    } as Response);

    renderWithProviders(
      <GamePlayer
        game={mockGame}
        slug="test-game-4"
      />,
    );
    fireEvent.click(screen.getByText('Start Adventure'));

    await vi.waitFor(() => expect(instances).toHaveLength(1), { timeout: 2000 });

    act(() => instances[0].onended?.());
    // 给可能的（错误的）后续播放一点时间，确认确实没有发生
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(instances).toHaveLength(1);
  });
});
