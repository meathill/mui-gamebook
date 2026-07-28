import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type GamePanel, parseGameHash, useGameHashRoute } from '@/components/game-player/hooks/useGameHashRoute';

const PANELS: readonly GamePanel[] = ['settings', 'comments'];
const NO_PANELS: readonly GamePanel[] = [];

describe('parseGameHash', () => {
  it('空 hash 落在 intro', () => {
    expect(parseGameHash('', 'intro', PANELS)).toEqual({ view: 'intro', panel: null });
    expect(parseGameHash('#', 'play', PANELS)).toEqual({ view: 'intro', panel: null });
  });

  it('#play 进入游戏视图，大小写不敏感', () => {
    expect(parseGameHash('#play', 'intro', PANELS)).toEqual({ view: 'play', panel: null });
    expect(parseGameHash('#PLAY', 'intro', PANELS)).toEqual({ view: 'play', panel: null });
  });

  it('注册过的面板 hash 冷启动时用注册表里的 base 视图兜底', () => {
    expect(parseGameHash('#settings', 'intro', PANELS)).toEqual({ view: 'play', panel: 'settings' });
    expect(parseGameHash('#comments', 'intro', PANELS)).toEqual({ view: 'play', panel: 'comments' });
  });

  it('已经在游戏里时面板只叠加，不改视图', () => {
    expect(parseGameHash('#settings', 'play', PANELS)).toEqual({ view: 'play', panel: 'settings' });
  });

  it('未注册的面板（如 classic 播放器）归一成 intro，不会把人塞进游戏', () => {
    expect(parseGameHash('#comments', 'intro', NO_PANELS)).toEqual({ view: 'intro', panel: null });
  });

  it('认不出来的 hash 一律当 intro，不猜不报错', () => {
    expect(parseGameHash('#gallery', 'intro', PANELS)).toEqual({ view: 'intro', panel: null });
    expect(parseGameHash('#access_token=abc', 'play', PANELS)).toEqual({ view: 'intro', panel: null });
  });
});

describe('useGameHashRoute', () => {
  // vi.spyOn 对已经被 spy 的方法会返回同一个 spy 实例，所以必须显式 mockClear，
  // 否则调用次数会跨用例累加
  let pushSpy: ReturnType<typeof vi.spyOn>;
  let replaceSpy: ReturnType<typeof vi.spyOn>;
  let backSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    pushSpy = vi.spyOn(window.history, 'pushState');
    replaceSpy = vi.spyOn(window.history, 'replaceState');
    backSpy = vi.spyOn(window.history, 'back');
    window.history.replaceState(null, '', '/play/demo');
    pushSpy.mockClear();
    replaceSpy.mockClear();
    backSpy.mockClear();
  });

  it('首帧固定 intro（hash 只能在 effect 里读，否则 SSR 水合会 mismatch）', () => {
    window.history.replaceState(null, '', '/play/demo#play');
    const { result } = renderHook(() => useGameHashRoute(PANELS));

    // effect 跑完后才切到 play，说明首帧渲染的是 intro
    expect(result.current.view).toBe('play');
    expect(result.current.panel).toBeNull();
  });

  it('goToView("play") 用 pushState 写入 #play', () => {
    const { result } = renderHook(() => useGameHashRoute(PANELS));

    act(() => result.current.goToView('play'));

    expect(result.current.view).toBe('play');
    expect(window.location.hash).toBe('#play');
    expect(pushSpy).toHaveBeenCalled();
  });

  it('goToView("intro") 回到干净 URL，不留裸 #', () => {
    const { result } = renderHook(() => useGameHashRoute(PANELS));
    act(() => result.current.goToView('play'));

    act(() => result.current.goToView('intro'));

    expect(result.current.view).toBe('intro');
    expect(window.location.hash).toBe('');
    expect(window.location.href).not.toContain('#');
  });

  it('打开面板用 push，面板之间互切用 replace（栈里最多一条面板记录）', () => {
    const { result } = renderHook(() => useGameHashRoute(PANELS));
    act(() => result.current.goToView('play'));
    pushSpy.mockClear();
    replaceSpy.mockClear();

    act(() => result.current.openPanel('settings'));
    expect(result.current).toMatchObject({ view: 'play', panel: 'settings' });
    expect(pushSpy).toHaveBeenCalledTimes(1);
    expect(replaceSpy).not.toHaveBeenCalled();

    act(() => result.current.openPanel('comments'));
    expect(result.current).toMatchObject({ view: 'play', panel: 'comments' });
    expect(pushSpy).toHaveBeenCalledTimes(1);
    expect(replaceSpy).toHaveBeenCalledTimes(1);
  });

  it('关闭自己 push 的面板走 history.back()，与系统返回键行为一致', async () => {
    const { result } = renderHook(() => useGameHashRoute(PANELS));
    act(() => result.current.goToView('play'));
    act(() => result.current.openPanel('settings'));

    act(() => result.current.closePanel());

    expect(backSpy).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(result.current.panel).toBeNull());
    expect(result.current.view).toBe('play');
    expect(window.location.hash).toBe('#play');
  });

  it('冷启动直接落在面板 hash 上时不调 back（否则会把用户弹出站外），改用 replaceState', () => {
    window.history.replaceState(null, '', '/play/demo#settings');
    const { result } = renderHook(() => useGameHashRoute(PANELS));
    expect(result.current).toMatchObject({ view: 'play', panel: 'settings' });
    replaceSpy.mockClear();

    act(() => result.current.closePanel());

    expect(backSpy).not.toHaveBeenCalled();
    expect(replaceSpy).toHaveBeenCalledTimes(1);
    expect(result.current.panel).toBeNull();
    expect(window.location.hash).toBe('#play');
  });

  it('面板开着时切视图用 replace，吃掉那条面板记录', () => {
    const { result } = renderHook(() => useGameHashRoute(PANELS));
    act(() => result.current.goToView('play'));
    act(() => result.current.openPanel('settings'));
    pushSpy.mockClear();
    replaceSpy.mockClear();

    act(() => result.current.goToView('intro'));

    expect(result.current).toMatchObject({ view: 'intro', panel: null });
    expect(pushSpy).not.toHaveBeenCalled();
    expect(replaceSpy).toHaveBeenCalledTimes(1);
  });

  it('响应外部 hash 变化（浏览器前进后退、手动改地址栏）', async () => {
    const { result } = renderHook(() => useGameHashRoute(PANELS));

    act(() => {
      window.history.replaceState(null, '', '/play/demo#play');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });

    await waitFor(() => expect(result.current.view).toBe('play'));
  });

  it('closePanel 在没有面板打开时是空操作', () => {
    const { result } = renderHook(() => useGameHashRoute(PANELS));
    act(() => result.current.goToView('play'));
    replaceSpy.mockClear();

    act(() => result.current.closePanel());

    expect(replaceSpy).not.toHaveBeenCalled();
    expect(result.current.view).toBe('play');
  });
});
