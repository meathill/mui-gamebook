import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { betterAuthMock } = vi.hoisted(() => ({
  // betterAuth 本身只是把 config 对象转成 auth 实例；这里直接把 config 原样回传，
  // 这样调用方拿到的返回值就是 config 本身，方便测试直接断言字段，不用去翻 mock.calls。
  betterAuthMock: vi.fn((config: unknown) => config),
}));

vi.mock('better-auth', () => ({
  betterAuth: betterAuthMock,
}));

vi.mock('better-auth/adapters/drizzle', () => ({
  drizzleAdapter: vi.fn(() => ({})),
}));

vi.mock('drizzle-orm/d1', () => ({
  drizzle: vi.fn(() => ({})),
}));

vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn(),
}));

import { createAuth } from '@/lib/auth-config';
import { sendEmail } from '@/lib/email';

function makeEnv(overrides: { TRUSTED_ORIGINS?: string; COOKIE_DOMAIN?: string } = {}): CloudflareEnv {
  return {
    DB: {},
    ...overrides,
  } as unknown as CloudflareEnv;
}

describe('createAuth', () => {
  const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (originalSiteUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SITE_URL;
    } else {
      process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
    }
  });

  describe('baseURL / trustedOrigins', () => {
    it('NEXT_PUBLIC_SITE_URL 存在时使用它作为 baseURL 和唯一的 trustedOrigin', () => {
      process.env.NEXT_PUBLIC_SITE_URL = 'https://custom.example.com';

      const config = createAuth(makeEnv()) as unknown as { baseURL: string; trustedOrigins: string[] };

      expect(config.baseURL).toBe('https://custom.example.com');
      expect(config.trustedOrigins).toEqual(['https://custom.example.com']);
    });

    it('NEXT_PUBLIC_SITE_URL 不存在时回退到 https://muistory.com', () => {
      delete process.env.NEXT_PUBLIC_SITE_URL;

      const config = createAuth(makeEnv()) as unknown as { baseURL: string };

      expect(config.baseURL).toBe('https://muistory.com');
    });

    it('TRUSTED_ORIGINS 存在时 trim 并追加到 siteUrl 后面', () => {
      process.env.NEXT_PUBLIC_SITE_URL = 'https://muistory.com';

      const config = createAuth(makeEnv({ TRUSTED_ORIGINS: 'https://a.com, https://b.com ' })) as unknown as {
        trustedOrigins: string[];
      };

      expect(config.trustedOrigins).toEqual(['https://muistory.com', 'https://a.com', 'https://b.com']);
    });
  });

  describe('advanced.crossSubDomainCookies', () => {
    it('没有 COOKIE_DOMAIN 时为 undefined', () => {
      const config = createAuth(makeEnv()) as unknown as { advanced: { crossSubDomainCookies?: unknown } };

      expect(config.advanced.crossSubDomainCookies).toBeUndefined();
    });

    it('有 COOKIE_DOMAIN 时启用跨子域 cookie', () => {
      const config = createAuth(makeEnv({ COOKIE_DOMAIN: '.muistory.com' })) as unknown as {
        advanced: { crossSubDomainCookies?: { enabled: boolean; domain: string } };
      };

      expect(config.advanced.crossSubDomainCookies).toEqual({ enabled: true, domain: '.muistory.com' });
    });
  });

  describe('邮件回调', () => {
    it('sendResetPassword 发送重置密码邮件，正文包含链接', async () => {
      const config = createAuth(makeEnv()) as unknown as {
        emailAndPassword: {
          sendResetPassword: (params: { user: { email: string; name?: string }; url: string }) => Promise<void>;
        };
      };

      await config.emailAndPassword.sendResetPassword({
        user: { email: 'a@b.com', name: '小明' },
        url: 'https://muistory.com/reset?token=xyz',
      });

      expect(sendEmail).toHaveBeenCalledTimes(1);
      const [options] = (sendEmail as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(options.to).toBe('a@b.com');
      expect(options.subject).toContain('重置密码');
      expect(options.body).toContain('https://muistory.com/reset?token=xyz');
      expect(options.body).toContain('小明');
    });

    it('sendResetPassword 在用户没有 name 时不插入多余的问候语片段', async () => {
      const config = createAuth(makeEnv()) as unknown as {
        emailAndPassword: {
          sendResetPassword: (params: { user: { email: string; name?: string }; url: string }) => Promise<void>;
        };
      };

      await config.emailAndPassword.sendResetPassword({ user: { email: 'a@b.com' }, url: 'https://x.com/r' });

      const [options] = (sendEmail as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(options.body).not.toContain('，undefined');
    });

    it('sendVerificationEmail 发送验证邮箱邮件', async () => {
      const config = createAuth(makeEnv()) as unknown as {
        emailVerification: {
          sendVerificationEmail: (params: { user: { email: string; name?: string }; url: string }) => Promise<void>;
        };
      };

      await config.emailVerification.sendVerificationEmail({
        user: { email: 'c@d.com', name: '小红' },
        url: 'https://muistory.com/verify?token=abc',
      });

      expect(sendEmail).toHaveBeenCalledTimes(1);
      const [options] = (sendEmail as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(options.to).toBe('c@d.com');
      expect(options.subject).toContain('验证邮箱');
      expect(options.body).toContain('https://muistory.com/verify?token=abc');
    });
  });
});
