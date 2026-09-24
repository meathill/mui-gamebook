import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isAdminUser, isRootUser } from '@/lib/admin';

describe('isRootUser', () => {
  const originalEnv = process.env.NEXT_PUBLIC_ROOT_USER_EMAIL;

  beforeEach(() => {
    delete (process.env as Record<string, string | undefined>).NEXT_PUBLIC_ROOT_USER_EMAIL;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.NEXT_PUBLIC_ROOT_USER_EMAIL = originalEnv;
    } else {
      delete (process.env as Record<string, string | undefined>).NEXT_PUBLIC_ROOT_USER_EMAIL;
    }
  });

  it('未配置时任何邮箱都不是 root', () => {
    expect(isRootUser('admin@test.com')).toBe(false);
  });

  it('null/undefined 返回 false', () => {
    process.env.NEXT_PUBLIC_ROOT_USER_EMAIL = 'admin@test.com';
    expect(isRootUser(null)).toBe(false);
    expect(isRootUser(undefined)).toBe(false);
    expect(isRootUser('')).toBe(false);
  });

  it('忽略大小写与首尾空白', () => {
    process.env.NEXT_PUBLIC_ROOT_USER_EMAIL = 'Admin@Test.com';
    expect(isRootUser('admin@test.com')).toBe(true);
    expect(isRootUser('  ADMIN@TEST.COM  ')).toBe(true);
  });

  it('root 只有一个，逗号分隔的其它邮箱不被识别', () => {
    process.env.NEXT_PUBLIC_ROOT_USER_EMAIL = 'admin1@test.com,admin2@test.com';
    expect(isRootUser('admin1@test.com')).toBe(false);
    expect(isRootUser('admin2@test.com')).toBe(false);
  });

  it('其它邮箱返回 false', () => {
    process.env.NEXT_PUBLIC_ROOT_USER_EMAIL = 'admin@test.com';
    expect(isRootUser('user@test.com')).toBe(false);
  });
});

describe('isAdminUser', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_ROOT_USER_EMAIL = 'root@test.com';
  });

  it('null 用户返回 false', () => {
    expect(isAdminUser(null)).toBe(false);
    expect(isAdminUser(undefined)).toBe(false);
  });

  it('root 邮箱即使没有 is_admin 标记也算管理员', () => {
    expect(isAdminUser({ email: 'root@test.com' })).toBe(true);
  });

  it('is_admin 为 true 的内容管理员算管理员', () => {
    expect(isAdminUser({ email: 'ca@test.com', isAdmin: true })).toBe(true);
  });

  it('普通用户不是管理员', () => {
    expect(isAdminUser({ email: 'user@test.com' })).toBe(false);
    expect(isAdminUser({ email: 'user@test.com', isAdmin: false })).toBe(false);
    expect(isAdminUser({ email: 'user@test.com', isAdmin: null })).toBe(false);
  });
});
