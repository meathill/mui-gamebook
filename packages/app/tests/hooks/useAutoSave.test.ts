import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { saveDraft, loadDraft, clearDraft } from '@/hooks/useAutoSave';

// Mock localStorage
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete store[key];
  }),
  clear: vi.fn(() => {
    for (const key of Object.keys(store)) delete store[key];
  }),
  get length() {
    return Object.keys(store).length;
  },
  key: vi.fn(),
};

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

describe('useAutoSave - localStorage 草稿操作', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  describe('saveDraft', () => {
    it('应将草稿保存到 localStorage', () => {
      const before = Date.now();
      saveDraft('game-1', '# Hello');
      const after = Date.now();

      const raw = store['editor-draft-game-1'];
      expect(raw).toBeDefined();

      const draft = JSON.parse(raw);
      expect(draft.content).toBe('# Hello');
      expect(draft.savedAt).toBeGreaterThanOrEqual(before);
      expect(draft.savedAt).toBeLessThanOrEqual(after);
    });

    it('多次保存应覆盖旧草稿', () => {
      saveDraft('game-1', 'v1');
      saveDraft('game-1', 'v2');

      const draft = JSON.parse(store['editor-draft-game-1']);
      expect(draft.content).toBe('v2');
    });

    it('不同 gameId 的草稿互不影响', () => {
      saveDraft('game-1', 'content-1');
      saveDraft('game-2', 'content-2');

      expect(JSON.parse(store['editor-draft-game-1']).content).toBe('content-1');
      expect(JSON.parse(store['editor-draft-game-2']).content).toBe('content-2');
    });
  });

  describe('loadDraft', () => {
    it('无草稿时返回 null', () => {
      expect(loadDraft('nonexistent')).toBeNull();
    });

    it('应正确加载已保存的草稿', () => {
      saveDraft('game-1', '# Test');
      const draft = loadDraft('game-1');

      expect(draft).not.toBeNull();
      expect(draft!.content).toBe('# Test');
      expect(draft!.savedAt).toBeGreaterThan(0);
    });

    it('损坏的数据返回 null', () => {
      store['editor-draft-game-1'] = '{invalid json';
      expect(loadDraft('game-1')).toBeNull();
    });
  });

  describe('clearDraft', () => {
    it('应删除指定草稿', () => {
      saveDraft('game-1', 'content');
      clearDraft('game-1');

      expect(loadDraft('game-1')).toBeNull();
    });

    it('清除不存在的草稿不报错', () => {
      expect(() => clearDraft('nonexistent')).not.toThrow();
    });

    it('只删除指定的草稿，不影响其他', () => {
      saveDraft('game-1', 'a');
      saveDraft('game-2', 'b');
      clearDraft('game-1');

      expect(loadDraft('game-1')).toBeNull();
      expect(loadDraft('game-2')).not.toBeNull();
    });
  });
});
