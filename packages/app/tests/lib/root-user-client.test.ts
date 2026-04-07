import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// Test the isRootUserClient logic used in Header and admin layout
// This is a pure function that checks NEXT_PUBLIC_ROOT_USER_EMAIL env var
function isRootUserClient(email: string | undefined): boolean {
  if (!email) return false;
  const rootEmails = process.env.NEXT_PUBLIC_ROOT_USER_EMAIL?.split(',').map((e) => e.trim().toLowerCase()) || [];
  return rootEmails.includes(email.toLowerCase());
}

describe('isRootUserClient', () => {
  const originalEnv = process.env.NEXT_PUBLIC_ROOT_USER_EMAIL;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.NEXT_PUBLIC_ROOT_USER_EMAIL = originalEnv;
    } else {
      delete process.env.NEXT_PUBLIC_ROOT_USER_EMAIL;
    }
  });

  it('应该在未设置环境变量时返回 false', () => {
    delete process.env.NEXT_PUBLIC_ROOT_USER_EMAIL;
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
