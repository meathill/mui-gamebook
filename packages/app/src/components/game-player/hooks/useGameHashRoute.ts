import { useCallback, useEffect, useRef, useState } from 'react';

export type GameView = 'intro' | 'play';
export type GamePanel = 'settings' | 'comments';

/**
 * 面板注册表。key 就是 hash 里的 token，值是「冷启动直接落在这个 hash 上」时
 * 铺在面板底下的视图。以后加画廊只要加一行：gallery: 'intro'。
 */
const PANEL_BASE: Record<GamePanel, GameView> = {
  settings: 'play',
  comments: 'play',
};

export interface GameRoute {
  view: GameView;
  panel: GamePanel | null;
}

const INTRO: GameRoute = { view: 'intro', panel: null };

/** 面板只叠加、不切视图：已经在游戏里就留在游戏里，base 仅用于冷启动兜底 */
function resolvePanelView(panel: GamePanel, currentView: GameView): GameView {
  return currentView === 'play' ? 'play' : PANEL_BASE[panel];
}

/** hash → 路由。认不出来的 hash（外链锚点、第三方回跳的 #access_token 等）一律当 intro，不猜 */
export function parseGameHash(hash: string, currentView: GameView, panels: readonly GamePanel[]): GameRoute {
  const token = hash.replace(/^#/, '').toLowerCase();
  if (!token) return INTRO;
  if (token === 'play') return { view: 'play', panel: null };
  if ((panels as readonly string[]).includes(token)) {
    const panel = token as GamePanel;
    return { view: resolvePanelView(panel, currentView), panel };
  }
  return INTRO;
}

export interface GameHashRoute extends GameRoute {
  goToView: (view: GameView) => void;
  openPanel: (panel: GamePanel) => void;
  closePanel: () => void;
}

/**
 * 把播放页的视图与面板状态放进 URL hash。
 *
 * 约定：无 hash = intro，#play = 游戏中，其余注册过的 token = 叠在视图上的面板。
 * 视图切换用 push（页面语义），面板打开用 push、关闭用 history.back()（模态语义），
 * 这样 X 按钮和系统返回键行为完全一致。
 *
 * 首帧固定 intro：hash 不会发到服务端，SSR 输出的就是标题页，
 * 水合首帧必须跟它一模一样，所以 hash 只能在 effect 里读。
 */
export function useGameHashRoute(panels: readonly GamePanel[]): GameHashRoute {
  const [route, setRoute] = useState<GameRoute>(INTRO);
  const routeRef = useRef(route);
  const panelsRef = useRef(panels);
  panelsRef.current = panels;
  // 当前这条面板历史记录是不是我们自己 push 的，决定关面板能不能安全 history.back()
  const didPushPanelRef = useRef(false);

  const syncFromLocation = useCallback(() => {
    const next = parseGameHash(window.location.hash, routeRef.current.view, panelsRef.current);
    if (next.panel === null) didPushPanelRef.current = false;
    if (next.view === routeRef.current.view && next.panel === routeRef.current.panel) return;
    routeRef.current = next;
    setRoute(next);
  }, []);

  useEffect(() => {
    syncFromLocation();
    // hashchange 覆盖手动改 hash 和前进后退；popstate 兜住 Next 路由用 pushState 造成的历史移动
    window.addEventListener('hashchange', syncFromLocation);
    window.addEventListener('popstate', syncFromLocation);
    return () => {
      window.removeEventListener('hashchange', syncFromLocation);
      window.removeEventListener('popstate', syncFromLocation);
    };
  }, [syncFromLocation]);

  const navigate = useCallback((next: GameRoute, replace: boolean) => {
    const token = next.panel ?? (next.view === 'play' ? 'play' : '');
    const { pathname, search } = window.location;
    const href = token ? `${pathname}${search}#${token}` : `${pathname}${search}`;
    // 一律走 history API：给 location.hash 赋值会触发浏览器锚点滚动，也没法把 # 本身去干净
    if (replace) {
      window.history.replaceState(null, '', href);
    } else {
      window.history.pushState(null, '', href);
    }
    routeRef.current = next;
    setRoute(next);
  }, []);

  const goToView = useCallback(
    (view: GameView) => {
      // 面板开着时切视图：复用面板那条记录，历史栈里不留已经关掉的面板
      const replace = didPushPanelRef.current;
      didPushPanelRef.current = false;
      navigate({ view, panel: null }, replace);
    },
    [navigate],
  );

  const openPanel = useCallback(
    (panel: GamePanel) => {
      // 面板之间互切用 replace：返回键永远退回没有面板的那一屏，栈里最多一条面板记录
      const replace = routeRef.current.panel !== null;
      if (!replace) didPushPanelRef.current = true;
      navigate({ view: resolvePanelView(panel, routeRef.current.view), panel }, replace);
    },
    [navigate],
  );

  const closePanel = useCallback(() => {
    if (routeRef.current.panel === null) return;
    if (didPushPanelRef.current) {
      // 自己 push 的记录交给 back：X 按钮和系统返回键行为完全一致
      didPushPanelRef.current = false;
      window.history.back();
      return;
    }
    // 冷启动直接落在面板 hash 上，没有可退的历史，原地 replace 掉
    navigate({ view: routeRef.current.view, panel: null }, true);
  }, [navigate]);

  return { ...route, goToView, openPanel, closePanel };
}
