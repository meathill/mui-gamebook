/**
 * 异步操作轮询管理器
 * 在应用级别管理 pending 操作的轮询，独立于组件生命周期
 */

type OperationCallback = (operationId: number, result: { status: 'completed' | 'failed'; url?: string; error?: string }) => void;

interface PendingOperation {
  operationId: number;
  callback: OperationCallback;
  attempts: number;
  timeoutId?: ReturnType<typeof setTimeout>;
  lastRequestDuration: number; // 上次请求耗时（毫秒）
}

class PendingOperationsManager {
  private operations: Map<number, PendingOperation> = new Map();
  private minPollInterval = 5000; // 最小轮询间隔 5 秒
  private maxPollInterval = 30000; // 最大轮询间隔 30 秒
  private maxAttempts = 120; // 最多 120 次尝试

  /**
   * 注册一个 pending 操作进行轮询
   */
  register(operationId: number, callback: OperationCallback) {
    if (this.operations.has(operationId)) {
      // 更新回调函数（可能组件重新渲染了）
      const op = this.operations.get(operationId)!;
      op.callback = callback;
      return;
    }

    this.operations.set(operationId, {
      operationId,
      callback,
      attempts: 0,
      lastRequestDuration: this.minPollInterval,
    });

    // 立即检查一次
    this.checkOperation(operationId);
  }

  /**
   * 取消注册一个操作
   */
  unregister(operationId: number) {
    const operation = this.operations.get(operationId);
    if (operation?.timeoutId) {
      clearTimeout(operation.timeoutId);
    }
    this.operations.delete(operationId);
  }

  /**
   * 从 URL 中提取并注册操作
   */
  registerFromUrl(url: string, callback: OperationCallback): number | null {
    if (!url.startsWith('pending://')) return null;
    const operationId = parseInt(url.replace('pending://', ''), 10);
    if (isNaN(operationId)) return null;
    this.register(operationId, callback);
    return operationId;
  }

  /**
   * 批量检查多个 URL，返回已完成的映射
   */
  async batchCheck(urls: string[]): Promise<Map<string, { url?: string; error?: string; status: string }>> {
    const results = new Map<string, { url?: string; error?: string; status: string }>();
    const pendingUrls = urls.filter(url => url.startsWith('pending://'));

    await Promise.all(
      pendingUrls.map(async (pendingUrl) => {
        try {
          const res = await fetch(`/api/cms/operations?url=${encodeURIComponent(pendingUrl)}`);
          const data = await res.json() as { status: string; url?: string; error?: string };
          results.set(pendingUrl, data);
        } catch (e) {
          console.error('Check pending operation error:', e);
        }
      })
    );

    return results;
  }

  /**
   * 调度下一次检查，间隔基于上次请求耗时
   */
  private scheduleNextCheck(operationId: number) {
    const operation = this.operations.get(operationId);
    if (!operation) return;

    // 清除已有的定时器
    if (operation.timeoutId) {
      clearTimeout(operation.timeoutId);
    }

    // 使用上次请求耗时作为间隔，限制在 [min, max] 范围内
    const interval = Math.min(
      Math.max(operation.lastRequestDuration, this.minPollInterval),
      this.maxPollInterval
    );

    operation.timeoutId = setTimeout(() => this.checkOperation(operationId), interval);
  }

  private async checkOperation(operationId: number) {
    const operation = this.operations.get(operationId);
    if (!operation) return;

    operation.attempts += 1;

    // 超时检查
    if (operation.attempts >= this.maxAttempts) {
      operation.callback(operationId, { status: 'failed', error: '操作超时' });
      this.unregister(operationId);
      return;
    }

    const startTime = Date.now();
    try {
      const res = await fetch(`/api/cms/operations?id=${operationId}`);
      const data = await res.json() as { status: string; url?: string; error?: string };

      // 记录本次请求耗时
      operation.lastRequestDuration = Date.now() - startTime;

      if (data.status === 'completed' && data.url) {
        operation.callback(operationId, { status: 'completed', url: data.url });
        this.unregister(operationId);
      } else if (data.status === 'failed') {
        operation.callback(operationId, { status: 'failed', error: data.error });
        this.unregister(operationId);
      } else {
        // pending 状态，调度下一次检查
        this.scheduleNextCheck(operationId);
      }
    } catch (e) {
      console.error('Check operation error:', e);
      // 请求失败也记录耗时并继续轮询
      operation.lastRequestDuration = Date.now() - startTime;
      this.scheduleNextCheck(operationId);
    }
  }

  /**
   * 获取当前 pending 操作数量
   */
  get pendingCount() {
    return this.operations.size;
  }

  /**
   * 检查某个操作是否正在轮询中
   */
  isPolling(operationId: number): boolean {
    return this.operations.has(operationId);
  }
}

// 导出单例
export const pendingOperationsManager = new PendingOperationsManager();

/**
 * 检查 URL 是否是占位符
 */
export function isPlaceholderUrl(url: string): boolean {
  return url.startsWith('pending://');
}

/**
 * 从占位符 URL 提取操作 ID
 */
export function extractOperationId(url: string): number | null {
  if (!isPlaceholderUrl(url)) return null;
  const id = parseInt(url.replace('pending://', ''), 10);
  return isNaN(id) ? null : id;
}
