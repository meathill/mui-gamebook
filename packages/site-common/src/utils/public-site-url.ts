const DEFAULT_PUBLIC_SITE_URL = 'https://muistory.com';

/**
 * 把站点 origin 收成可写进 sitemap / canonical / JSON-LD 的正式地址：
 * 去空白、补协议、去掉尾斜杠。非 localhost 一律 https。
 */
export function getPublicSiteUrl(raw?: string | null, fallback = DEFAULT_PUBLIC_SITE_URL): string {
  const value = (raw ?? '').trim();
  const source = value || fallback;
  const withProtocol = /^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(source) ? source : `https://${source}`;

  try {
    const url = new URL(withProtocol);
    const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    if (!isLocal) {
      url.protocol = 'https:';
    }
    url.hash = '';
    url.search = '';
    url.pathname = '';
    url.username = '';
    url.password = '';
    return url.origin;
  } catch {
    return fallback.replace(/\/$/, '');
  }
}
