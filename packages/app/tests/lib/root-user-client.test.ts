import { describe, it, expect, afterEach } from 'vitest';
import { isRootUserClient } from '@/lib/auth-client';

describe('isRootUserClient', () => {
  const originalEnv = process.env.NEXT_PUBLIC_ROOT_USER_EMAIL;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.NEXT_PUBLIC_ROOT_USER_EMAIL = originalEnv;
    } else {
      delete (process.env as Record<string, string | undefined>).NEXT_PUBLIC_ROOT_USER_EMAIL;
    }
  });

  it('应该在未设置环境变量时返回 false', () => {
    delete (process.env as Record<string, string | undefined>).NEXT_PUBLIC_ROOT_USER_EMAIL;
    expect(isRootUserClient('any@test.com')).toBe(false);
  });

  it('应该在 email 为 undefined 时返回 false', () => {
    process.env.NEXT_PUBLIC_ROOT_USER_EMAIL = 'admin@test.com';
    expect(isRootUserClient(undefined)).toBe(false);
  });

  it('应该正确识别管理员邮箱', () => {
    process.env.NEXT_PUBLIC_ROOT_USER_EMAIL = 'admin@test.com';
    expect(isRootUserClient('admin@test.com')).toBe(true);
    expect(isRootUserClient('user@test.com')).toBe(false);
  });

  it('应该忽略大小写', () => {
    process.env.NEXT_PUBLIC_ROOT_USER_EMAIL = 'Admin@Test.com';
    expect(isRootUserClient('admin@test.com')).toBe(true);
    expect(isRootUserClient('ADMIN@TEST.COM')).toBe(true);
  });

  it('应该支持多个管理员邮箱（逗号分隔）', () => {
    process.env.NEXT_PUBLIC_ROOT_USER_EMAIL = 'admin1@test.com, admin2@test.com';
    expect(isRootUserClient('admin1@test.com')).toBe(true);
    expect(isRootUserClient('admin2@test.com')).toBe(true);
    expect(isRootUserClient('user@test.com')).toBe(false);
  });
});
