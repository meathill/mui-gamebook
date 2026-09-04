/**
 * GA4 关键事件定义（issue #19）。
 *
 * 3 个自定义关键事件（需在 GA4 界面「管理 > 关键事件」中标记为关键事件）：
 * - start_reading：开始阅读（SEO 自然流量转化的核心桥接信号）
 * - complete_reading：读完故事（深度互动）
 * - publish_story：发布故事（创作漏斗终点，新增公开落地页）
 * 另附 2 个 GA4 推荐事件用于登录前后归因（sign_up 建议同样标为关键事件）：
 * - sign_up / login
 *
 * 边界约定：
 * - 阅读类事件只在公开播放页触发（主站 /play/[slug]、55 单本子站）。
 *   私有编辑器预览、草稿页不走这些组件，天然隔离。
 * - 登录前后归因依赖 gtag 默认 _ga cookie（同一域名下 client_id 不变），
 *   登录/注册成功后上报标准事件即可在 GA4 里串起同一伪用户。
 * - 复核时不要用总浏览次数推断转化：以 Organic Search 落地页维度
 *  （报告 > 获客 > 落地页 + 会话默认渠道分组）拆开看各事件数。
 */

export const GA_EVENT_START_READING = 'start_reading';
export const GA_EVENT_COMPLETE_READING = 'complete_reading';
export const GA_EVENT_PUBLISH_STORY = 'publish_story';
/** GA4 推荐事件：注册（建议标为关键事件，支撑登录前后归因） */
export const GA_EVENT_SIGN_UP = 'sign_up';
/** GA4 推荐事件：登录（不标关键事件，只用于归因串联） */
export const GA_EVENT_LOGIN = 'login';

export type GaEventParams = Record<string, string | number | boolean | undefined>;

type GtagFn = (command: 'event', eventName: string, params?: Record<string, string | number | boolean>) => void;

/**
 * 直调 window.gtag 发送事件。无 gtag（未配置 GA_ID、被广告拦截、SSR）时静默跳过，
 * 永远不抛错、不阻塞业务。
 */
export function sendGaEvent(eventName: string, params?: GaEventParams): void {
  try {
    if (typeof window === 'undefined') return;
    const gtag = (window as unknown as { gtag?: unknown }).gtag as GtagFn | undefined;
    if (typeof gtag !== 'function') return;
    const clean: Record<string, string | number | boolean> = {};
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) clean[key] = value;
      }
    }
    gtag('event', eventName, clean);
  } catch {
    // 埋点永不影响业务
  }
}

export interface ReadingEventTarget {
  gameId: number | string;
  slug: string;
}

/** 开始阅读：用户进入游玩视图（点开始/继续、#play 深链直达都算一次用户意图） */
export function trackStartReading({ gameId, slug }: ReadingEventTarget): void {
  sendGaEvent(GA_EVENT_START_READING, { game_id: gameId, game_slug: slug });
}

/** 读完故事：到达结局画面 */
export function trackCompleteReading({ gameId, slug }: ReadingEventTarget): void {
  sendGaEvent(GA_EVENT_COMPLETE_READING, { game_id: gameId, game_slug: slug });
}

/** 发布故事：草稿 → 已发布的状态跃迁（调用方负责只在跃迁时调一次） */
export function trackPublishStory({ gameId, slug }: ReadingEventTarget): void {
  sendGaEvent(GA_EVENT_PUBLISH_STORY, { game_id: gameId, game_slug: slug });
}

/** 注册成功（GA4 推荐事件，method 固定 email） */
export function trackSignUp(method = 'email'): void {
  sendGaEvent(GA_EVENT_SIGN_UP, { method });
}

/** 登录成功（GA4 推荐事件，只用于归因串联） */
export function trackLogin(method = 'email'): void {
  sendGaEvent(GA_EVENT_LOGIN, { method });
}

/**
 * 会话内去重：同一 tab 对同一 key 只执行一次 fire。
 * 用途：防 React StrictMode 双 effect、用户反复进出游玩视图导致的重复上报。
 * sessionStorage 不可用时直接执行（宁可多报，不可漏报）。
 *
 * @returns 是否实际执行了 fire
 */
export function trackOnce(key: string, fire: () => void): boolean {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      fire();
      return true;
    }
    if (window.sessionStorage.getItem(key)) return false;
    window.sessionStorage.setItem(key, '1');
    fire();
    return true;
  } catch {
    fire();
    return true;
  }
}

/** 开始阅读去重 key（按作品 slug 隔离） */
export function startReadingKey(slug: string): string {
  return `ga_start_reading_${slug}`;
}

/** 读完去重 key（按作品 slug 隔离） */
export function completeReadingKey(slug: string): string {
  return `ga_complete_reading_${slug}`;
}
