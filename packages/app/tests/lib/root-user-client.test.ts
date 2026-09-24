import { describe, it, expect, afterEach } from 'vitest';
import { isRootUserClient } from '@/lib/auth-client';
import { isRootUser } from '@/lib/admin';

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

  it('root 只有一个：逗号分隔的其它邮箱不再被识别', () => {
    process.env.NEXT_PUBLIC_ROOT_USER_EMAIL = 'admin1@test.com, admin2@test.com';
    expect(isRootUserClient('admin1@test.com')).toBe(false);
    expect(isRootUserClient('admin2@test.com')).toBe(false);
    expect(isRootUserClient('user@test.com')).toBe(false);
  });

  it('首尾空白不影响判定', () => {
    process.env.NEXT_PUBLIC_ROOT_USER_EMAIL = ' admin@test.com ';
    expect(isRootUserClient('admin@test.com')).toBe(true);
  });
});

/**
 * 服务端（isRootUser）与客户端（isRootUserClient）刻意读同一个
 * NEXT_PUBLIC_ROOT_USER_EMAIL：构建期内联后两侧值必然一致，
 * 不会出现「前端显示了后台入口、后端不放行」或反向的分歧。
 * 这组用例保证两者行为始终同步——任何一方改了变量名或大小写处理都会在这里失败。
 */
describe('服务端与客户端 root 判定一致', () => {
  const originalEnv = process.env.NEXT_PUBLIC_ROOT_USER_EMAIL;
  const cases = [
    { env: 'admin@test.com', email: 'admin@test.com' },
    { env: 'Admin@Test.com', email: 'ADMIN@test.com' },
    { env: ' admin@test.com ', email: 'admin@test.com' },
    { env: 'admin@test.com', email: 'other@test.com' },
    { env: 'admin1@test.com,admin2@test.com', email: 'admin1@test.com' },
    { env: '', email: 'admin@test.com' },
  ];

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.NEXT_PUBLIC_ROOT_USER_EMAIL = originalEnv;
    } else {
      delete (process.env as Record<string, string | undefined>).NEXT_PUBLIC_ROOT_USER_EMAIL;
    }
  });

  it.each(cases)('env=$env email=$email 时两侧结论相同', ({ env, email }) => {
    process.env.NEXT_PUBLIC_ROOT_USER_EMAIL = env;
    expect(isRootUser(email)).toBe(isRootUserClient(email));
  });
});
