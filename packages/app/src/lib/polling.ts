/**
 * 计算下一次轮询间隔：使用上次请求耗时，限制在 [minInterval, maxInterval] 范围内
 */
export function clampPollInterval(lastDuration: number, minInterval: number, maxInterval: number): number {
  return Math.min(Math.max(lastDuration, minInterval), maxInterval);
}
