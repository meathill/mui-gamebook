import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlayableGame } from '@roudanio/parser/src/types';
import GamePlayer from '@/components/GamePlayer';
import { DialogProvider } from '@/components/Dialog';
import messages from '../../src/i18n/messages/en.json';

window.scrollTo = vi.fn();

// 有声书探测接口：统一回 404，走"无音频"回退
function renderWithProviders(component: React.ReactElement) {
  return render(
    <NextIntlClientProvider
      messages={messages}
      locale="en">
      <DialogProvider>{component}</DialogProvider>
    </NextIntlClientProvider>,
  );
}

// 场景带配图的游戏：选项按钮受 hasReadAll 门槛控制（SceneNodes: !hasReadAll && hasImage 时隐藏）
const mockGame: PlayableGame = {
  slug: 'test-game',
  title: 'Test Adventure',
  description: 'A test game',
  initialState: {},
  startSceneId: 'start',
  scenes: {
    start: {
      id: 'start',
      nodes: [
        { type: 'static_image', url: 'https://i.muicv.com/gamebook/scene-1.png' },
        { type: 'text', content: 'You are at the start.' },
        { type: 'choice', text: '下一步', nextSceneId: 'end' },
      ],
    },
    end: {
      id: 'end',
      nodes: [{ type: 'text', content: 'The end.' }],
    },
  },
};

describe('GamePlayer 带图场景的选项显示', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    window.history.replaceState(null, '', '/');
  });

  it('从标题点「开始冒险」进入后，选项按钮应出现（回归：此前需刷新才显示）', () => {
    renderWithProviders(
      <GamePlayer
        game={mockGame}
        slug="image-choices-1"
      />,
    );

    fireEvent.click(screen.getByText('Start Adventure'));

    expect(screen.getByText('You are at the start.')).toBeInTheDocument();
    expect(screen.getByText('下一步')).toBeInTheDocument();
  });

  it('#play 深链冷启动（等价刷新路径）选项按钮正常显示', () => {
    window.history.replaceState(null, '', '/play/image-choices-2#play');

    renderWithProviders(
      <GamePlayer
        game={mockGame}
        slug="image-choices-2"
      />,
    );

    expect(screen.getByText('You are at the start.')).toBeInTheDocument();
    expect(screen.getByText('下一步')).toBeInTheDocument();
  });

  it('带图场景之间切换，选项正常显示（handleChoice 重置 hasReadAll 后能重新就位）', () => {
    const twoSceneGame: PlayableGame = {
      ...mockGame,
      scenes: {
        start: {
          id: 'start',
          nodes: [
            { type: 'static_image', url: 'https://i.muicv.com/gamebook/scene-1.png' },
            { type: 'text', content: 'You are at the start.' },
            { type: 'choice', text: '下一步', nextSceneId: 'next' },
          ],
        },
        next: {
          id: 'next',
          nodes: [
            { type: 'static_image', url: 'https://i.muicv.com/gamebook/scene-2.png' },
            { type: 'text', content: 'Second scene with image.' },
            { type: 'choice', text: '下一步二', nextSceneId: 'end' },
          ],
        },
        end: mockGame.scenes.end,
      },
    };

    renderWithProviders(
      <GamePlayer
        game={twoSceneGame}
        slug="image-choices-3"
      />,
    );

    fireEvent.click(screen.getByText('Start Adventure'));
    fireEvent.click(screen.getByText('下一步'));

    expect(screen.getByText('Second scene with image.')).toBeInTheDocument();
    expect(screen.getByText('下一步二')).toBeInTheDocument();
  });

  it('带图未读完时选项仅按 CSS 隐藏（移动端），不从 DOM 移除（桌面端始终可见）', () => {
    // 模拟内容超出视口、未触发"读完"检测：hasReadAll 停留 false，选项处于 gated 状态
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(500);
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(100);

    renderWithProviders(
      <GamePlayer
        game={mockGame}
        slug="image-choices-4"
      />,
    );

    fireEvent.click(screen.getByText('Start Adventure'));

    const choice = screen.getByText('下一步').closest('button');
    expect(choice).toBeInTheDocument();
    expect(choice).toHaveClass('hidden');
    expect(choice).toHaveClass('sm:flex');
  });
});
