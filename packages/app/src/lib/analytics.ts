/**
 * Analytics KV 工具库
 * 用于操作 Cloudflare KV 中的统计数据
 */

export interface AnalyticsEnv {
  KV: KVNamespace;
}

// KV Key 前缀
const PREFIX = 'analytics:game:';

// 生成 KV Key
export function getKey(gameId: number, type: string, ...extra: (string | number)[]): string {
  const parts = [PREFIX + gameId, type, ...extra];
  return parts.join(':');
}

// 递增计数器
export async function incrementCounter(kv: KVNamespace, key: string, delta = 1): Promise<number> {
  const current = await kv.get(key);
  const newValue = (parseInt(current || '0', 10) || 0) + delta;
  await kv.put(key, String(newValue));
  return newValue;
}

// 获取计数器值
export async function getCounter(kv: KVNamespace, key: string): Promise<number> {
  const value = await kv.get(key);
  return parseInt(value || '0', 10) || 0;
}

// 递增 JSON 对象中的某个键
export async function incrementJsonKey(
  kv: KVNamespace,
  key: string,
  jsonKey: string,
  delta = 1,
): Promise<Record<string, number>> {
  const current = await kv.get(key);
  const data: Record<string, number> = current ? JSON.parse(current) : {};
  data[jsonKey] = (data[jsonKey] || 0) + delta;
  await kv.put(key, JSON.stringify(data));
  return data;
}

// 获取 JSON 对象
export async function getJsonObject(kv: KVNamespace, key: string): Promise<Record<string, number>> {
  const value = await kv.get(key);
  return value ? JSON.parse(value) : {};
}

// 更新评分
export async function updateRating(
  kv: KVNamespace,
  key: string,
  rating: number,
): Promise<{ count: number; sum: number }> {
  const current = await kv.get(key);
  const data = current ? JSON.parse(current) : { count: 0, sum: 0 };
  data.count += 1;
  data.sum += rating;
  await kv.put(key, JSON.stringify(data));
  return data;
}

// 解析设备类型
export function parseDeviceType(userAgent: string | null): 'mobile' | 'tablet' | 'desktop' {
  if (!userAgent) return 'desktop';
  const ua = userAgent.toLowerCase();

  if (/ipad|tablet|playbook|silk/.test(ua)) {
    return 'tablet';
  }

  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/.test(ua)) {
    return 'mobile';
  }

  return 'desktop';
}

// 解析来源域名
export function parseReferrer(referrer: string | null): string {
  if (!referrer) return 'direct';

  try {
    const url = new URL(referrer);
    return url.hostname || 'direct';
  } catch {
    return 'direct';
  }
}
