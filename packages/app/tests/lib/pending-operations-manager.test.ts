import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  pendingOperationsManager,
  isPlaceholderUrl,
  extractOperationId,
} from '../../src/lib/pending-operations-manager';

describe('pending-operations-manager', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('isPlaceholderUrl', () => {
    it('应该正确识别占位符 URL', () => {
      expect(isPlaceholderUrl('pending://123')).toBe(true);
      expect(isPlaceholderUrl('pending://456')).toBe(true);
    });

    it('应该正确识别非占位符 URL', () => {
      expect(isPlaceholderUrl('https://example.com/image.jpg')).toBe(false);
      expect(isPlaceholderUrl('/local/image.jpg')).toBe(false);
      expect(isPlaceholderUrl('')).toBe(false);
    });
  });

  describe('extractOperationId', () => {
    it('应该从占位符 URL 提取操作 ID', () => {
      expect(extractOperationId('pending://123')).toBe(123);
      expect(extractOperationId('pending://456')).toBe(456);
    });

    it('非占位符 URL 应返回 null', () => {
      expect(extractOperationId('https://example.com')).toBe(null);
      expect(extractOperationId('/local/image.jpg')).toBe(null);
    });

    it('无效 ID 应返回 null', () => {
      expect(extractOperationId('pending://abc')).toBe(null);
    });
  });

  describe('pendingOperationsManager', () => {
    it('应该能注册和取消注册操作', () => {
      const callback = vi.fn();
      pendingOperationsManager.register(999, callback);
      expect(pendingOperationsManager.isPolling(999)).toBe(true);
      expect(pendingOperationsManager.pendingCount).toBeGreaterThan(0);

      pendingOperationsManager.unregister(999);
      expect(pendingOperationsManager.isPolling(999)).toBe(false);
    });

    it('registerFromUrl 应该从 URL 提取并注册', () => {
      const callback = vi.fn();
      const id = pendingOperationsManager.registerFromUrl('pending://888', callback);
      expect(id).toBe(888);
      expect(pendingOperationsManager.isPolling(888)).toBe(true);

      pendingOperationsManager.unregister(888);
    });

    it('registerFromUrl 非占位符 URL 应返回 null', () => {
      const callback = vi.fn();
      const id = pendingOperationsManager.registerFromUrl('https://example.com', callback);
      expect(id).toBe(null);
    });
  });
});
