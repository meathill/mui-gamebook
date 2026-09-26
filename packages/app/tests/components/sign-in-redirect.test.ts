import { describe, expect, it } from 'vitest';
import { getSafeRedirect } from '@/app/sign-in/page';

describe('getSafeRedirect', () => {
  it('合法的站内路径原样返回', () => {
    expect(getSafeRedirect('?redirect=%2Fplay%2Fabc')).toBe('/play/abc');
  });

  it('缺失时回退首页', () => {
    expect(getSafeRedirect('')).toBe('/');
  });

  it('站外地址回退首页（防开放重定向）', () => {
    expect(getSafeRedirect('?redirect=https%3A%2F%2Fevil.com')).toBe('/');
    expect(getSafeRedirect('?redirect=%2F%2Fevil.com')).toBe('/');
  });
});
