import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  completeReadingKey,
  startReadingKey,
  trackCompleteReading,
  trackLogin,
  trackOnce,
  trackPublishStory,
  trackSignUp,
  trackStartReading,
  sendGaEvent,
} from '../src/utils/ga-events';

describe('sendGaEvent', () => {
  beforeEach(() => {
    // 每个用例重置 gtag，避免互相污染
    delete (window as unknown as { gtag?: unknown }).gtag;
    window.sessionStorage.clear();
  });

  it('无 gtag 时静默跳过，不抛错', () => {
    expect(() => sendGaEvent('start_reading', { game_slug: 'demo' })).not.toThrow();
  });

  it('透传事件名与参数（undefined 值会被剥掉）', () => {
    const gtag = vi.fn();
    (window as unknown as { gtag?: unknown }).gtag = gtag;
    sendGaEvent('start_reading', { game_id: 36, game_slug: 'demo', empty: undefined });
    expect(gtag).toHaveBeenCalledWith('event', 'start_reading', { game_id: 36, game_slug: 'demo' });
  });

  it('gtag 抛错时不向上传播', () => {
    (window as unknown as { gtag?: unknown }).gtag = () => {
      throw new Error('blocked');
    };
    expect(() => sendGaEvent('start_reading')).not.toThrow();
  });
});

describe('关键事件 helper', () => {
  beforeEach(() => {
    delete (window as unknown as { gtag?: unknown }).gtag;
    window.sessionStorage.clear();
  });

  it('trackStartReading 上报 start_reading + 作品标识', () => {
    const gtag = vi.fn();
    (window as unknown as { gtag?: unknown }).gtag = gtag;
    trackStartReading({ gameId: 36, slug: 'dream' });
    expect(gtag).toHaveBeenCalledWith('event', 'start_reading', { game_id: 36, game_slug: 'dream' });
  });

  it('trackCompleteReading 上报 complete_reading', () => {
    const gtag = vi.fn();
    (window as unknown as { gtag?: unknown }).gtag = gtag;
    trackCompleteReading({ gameId: 36, slug: 'dream' });
    expect(gtag).toHaveBeenCalledWith('event', 'complete_reading', { game_id: 36, game_slug: 'dream' });
  });

  it('trackPublishStory 上报 publish_story（字符串 id 也支持）', () => {
    const gtag = vi.fn();
    (window as unknown as { gtag?: unknown }).gtag = gtag;
    trackPublishStory({ gameId: 'abc-123', slug: 'my-story' });
    expect(gtag).toHaveBeenCalledWith('event', 'publish_story', { game_id: 'abc-123', game_slug: 'my-story' });
  });

  it('trackSignUp/trackLogin 用 GA4 推荐事件名 + method', () => {
    const gtag = vi.fn();
    (window as unknown as { gtag?: unknown }).gtag = gtag;
    trackSignUp();
    trackLogin();
    expect(gtag).toHaveBeenCalledWith('event', 'sign_up', { method: 'email' });
    expect(gtag).toHaveBeenCalledWith('event', 'login', { method: 'email' });
  });
});

describe('trackOnce 会话去重', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('同一 key 只执行一次，不同作品互不干扰', () => {
    const fire = vi.fn();
    expect(trackOnce(startReadingKey('a'), fire)).toBe(true);
    expect(trackOnce(startReadingKey('a'), fire)).toBe(false);
    expect(trackOnce(startReadingKey('b'), fire)).toBe(true);
    expect(fire).toHaveBeenCalledTimes(2);
  });

  it('开始与完成是两把独立的锁', () => {
    const fire = vi.fn();
    trackOnce(startReadingKey('a'), fire);
    expect(trackOnce(completeReadingKey('a'), fire)).toBe(true);
    expect(fire).toHaveBeenCalledTimes(2);
  });
});
