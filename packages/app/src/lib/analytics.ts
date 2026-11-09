/**
 * Analytics 事件解析工具
 */

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
