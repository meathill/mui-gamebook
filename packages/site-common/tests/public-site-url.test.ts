import { describe, expect, it } from 'vitest';
import { getPublicSiteUrl } from '../src/utils/public-site-url';

describe('getPublicSiteUrl', () => {
  it('空值回落到 muistory.com', () => {
    expect(getPublicSiteUrl()).toBe('https://muistory.com');
    expect(getPublicSiteUrl('')).toBe('https://muistory.com');
    expect(getPublicSiteUrl('   ')).toBe('https://muistory.com');
    expect(getPublicSiteUrl(null)).toBe('https://muistory.com');
  });

  it('http 与尾斜杠都收成 https origin', () => {
    expect(getPublicSiteUrl('http://muistory.com')).toBe('https://muistory.com');
    expect(getPublicSiteUrl('http://muistory.com/')).toBe('https://muistory.com');
    expect(getPublicSiteUrl('https://muistory.com/')).toBe('https://muistory.com');
    expect(getPublicSiteUrl('  https://xiaoniaoshuo.com/play/x  ')).toBe('https://xiaoniaoshuo.com');
  });

  it('缺协议时补 https', () => {
    expect(getPublicSiteUrl('muistory.com')).toBe('https://muistory.com');
    expect(getPublicSiteUrl('55.muistory.com')).toBe('https://55.muistory.com');
  });

  it('localhost 保留原协议，方便本地开发', () => {
    expect(getPublicSiteUrl('http://localhost:3020')).toBe('http://localhost:3020');
    expect(getPublicSiteUrl('https://127.0.0.1:3020/')).toBe('https://127.0.0.1:3020');
  });

  it('非法输入回落到 fallback', () => {
    expect(getPublicSiteUrl('http://')).toBe('https://muistory.com');
    expect(getPublicSiteUrl('::', 'https://example.com/')).toBe('https://example.com');
  });
});
