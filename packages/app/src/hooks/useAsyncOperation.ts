/**
 * 异步操作轮询 Hook
 * 用于在前端轮询检查异步操作（如视频生成）的状态
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export type OperationStatus = 'pending' | 'completed' | 'failed';

export interface OperationState {
  status: OperationStatus;
  url?: string;
  error?: string;
}

interface UseAsyncOperationOptions {
  minPollInterval?: number; // 最小轮询间隔，默认 3000ms
  maxPollInterval?: number; // 最大轮询间隔，默认 30000ms
  maxAttempts?: number; // 最大尝试次数，默认 120
  onComplete?: (url: string) => void;
  onError?: (error: string) => void;
}

/**
 * 检查 URL 是否是占位符
 */
function isPlaceholderUrl(url: string): boolean {
  return url.startsWith('pending://');
}

export function useAsyncOperation(placeholderUrl: string | undefined, options: UseAsyncOperationOptions = {}) {
  const { minPollInterval = 3000, maxPollInterval = 30000, maxAttempts = 120, onComplete, onError } = options;

  const [state, setState] = useState<OperationState>({ status: 'pending' });
  const [isPolling, setIsPolling] = useState(false);
  const attemptCountRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastDurationRef = useRef(minPollInterval);

  const checkStatus = useCallback(async (): Promise<boolean> => {
    if (!placeholderUrl || !isPlaceholderUrl(placeholderUrl)) {
      return true;
    }

    const startTime = Date.now();
    try {
      const res = await fetch(`/api/cms/operations?url=${encodeURIComponent(placeholderUrl)}`);
      const data = (await res.json()) as { status: string; url?: string; error?: string };

      // 记录请求耗时
      lastDurationRef.current = Date.now() - startTime;

      if (data.status === 'completed' && data.url) {
        setState({ status: 'completed', url: data.url });
        setIsPolling(false);
        onComplete?.(data.url);
        return true;
      }

      if (data.status === 'failed') {
        setState({ status: 'failed', error: data.error });
        setIsPolling(false);
        onError?.(data.error || '操作失败');
        return true;
      }

      // 仍在处理中
      attemptCountRef.current += 1;
      if (attemptCountRef.current >= maxAttempts) {
        setState({ status: 'failed', error: '操作超时' });
        setIsPolling(false);
        onError?.('操作超时');
        return true;
      }

      return false;
    } catch (e) {
      console.error('Check operation status error:', e);
      lastDurationRef.current = Date.now() - startTime;
      return false;
    }
  }, [placeholderUrl, maxAttempts, onComplete, onError]);

  useEffect(() => {
    if (!placeholderUrl || !isPlaceholderUrl(placeholderUrl)) {
      return;
    }

    // 开始轮询
    setIsPolling(true);
    attemptCountRef.current = 0;
    lastDurationRef.current = minPollInterval;

    const poll = async () => {
      const done = await checkStatus();
      if (!done) {
        // 使用上次请求耗时作为间隔，限制在 [min, max] 范围内
        const interval = Math.min(Math.max(lastDurationRef.current, minPollInterval), maxPollInterval);
        timeoutRef.current = setTimeout(poll, interval);
      }
    };

    // 立即检查一次
    poll();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [placeholderUrl, minPollInterval, maxPollInterval, checkStatus]);

  const reset = useCallback(() => {
    setState({ status: 'pending' });
    attemptCountRef.current = 0;
  }, []);

  return {
    ...state,
    isPolling,
    reset,
  };
}

/**
 * 批量检查多个占位符 URL
 * 返回需要更新的 URL 映射
 */
export async function batchCheckPlaceholders(urls: string[]): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  const placeholders = urls.filter(isPlaceholderUrl);

  await Promise.all(
    placeholders.map(async (url) => {
      try {
        const res = await fetch(`/api/cms/operations?url=${encodeURIComponent(url)}`);
        const data = (await res.json()) as { status: string; url?: string };
        if (data.status === 'completed' && data.url) {
          results.set(url, data.url);
        }
      } catch (e) {
        console.error('Check placeholder error:', e);
      }
    }),
  );

  return results;
}
