// Extends Vitest's expect functionality with matchers from jest-dom
import '@testing-library/jest-dom';
import { beforeEach, vi } from 'vitest';

// Mock localStorage for jsdom environment
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = String(value);
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  };
})();
Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// jsdom 没有实现 ResizeObserver（@xyflow/react 等库依赖它来监听容器尺寸变化）
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
Object.defineProperty(globalThis, 'ResizeObserver', {
  value: ResizeObserverMock,
  writable: true,
});

// jsdom 没有实现 IntersectionObserver（评论区等组件用它做进入视口后再加载）。
// 回调永不触发，被观察的组件就停在懒加载前的占位状态，正是测试想要的
class IntersectionObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
Object.defineProperty(globalThis, 'IntersectionObserver', {
  value: IntersectionObserverMock,
  writable: true,
});

// jsdom 没有实现 scrollIntoView（下拉菜单等组件依赖它滚动到选中项）
Object.defineProperty(Element.prototype, 'scrollIntoView', {
  value: vi.fn(),
  writable: true,
});

// jsdom 一个测试文件共用一个 window 和一份 localStorage store：
// 播放页把视图状态放进了 URL hash，上个用例点完「开始」URL 会停在 #play，
// 下个用例 mount 时读到它就直接进游戏了。存档同理（原先靠每个用例换 slug 绕开）。
beforeEach(() => {
  window.history.replaceState(null, '', '/');
  localStorage.clear();
});
