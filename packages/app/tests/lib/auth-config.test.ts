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

const dbMock = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  get: vi.fn().mockResolvedValue(undefined),
};

vi.mock('drizzle-orm/d1', () => ({
  drizzle: vi.fn(() => dbMock),
}));

vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn(),
}));

import { createAuth } from '@/lib/auth-config';
import { sendEmail } from '@/lib/email';

function makeEnv(
  overrides: {
    TRUSTED_ORIGINS?: string;
    COOKIE_DOMAIN?: string;
    SENDFLARE_KEY?: string;
    NEXT_PUBLIC_ROOT_USER_EMAIL?: string;
  } = {},
): CloudflareEnv {
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

    it('NEXT_PUBLIC_SITE_URL 是 http 时提升为 https', () => {
      process.env.NEXT_PUBLIC_SITE_URL = 'http://custom.example.com/';

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

  describe('OTP 发码回调', () => {
    function getOtpCallback(env: CloudflareEnv) {
      const config = createAuth(env) as unknown as {
        plugins: Array<{
          id: string;
          options: { sendVerificationOTP: (data: { email: string; otp: string; type: string }) => Promise<void> };
        }>;
      };
      const otpPlugin = config.plugins.find((plugin) => plugin.id === 'email-otp') as {
        options: { sendVerificationOTP: (data: { email: string; otp: string; type: string }) => Promise<void> };
      };
      return otpPlugin.options.sendVerificationOTP;
    }

    beforeEach(() => {
      dbMock.select.mockClear().mockReturnThis();
      dbMock.from.mockClear().mockReturnThis();
      dbMock.where.mockClear().mockReturnThis();
      dbMock.get.mockClear().mockResolvedValue(undefined);
    });

    it('发送 sign-in 类型验证码邮件，正文包含验证码', async () => {
      const sendVerificationOTP = getOtpCallback(makeEnv({ SENDFLARE_KEY: 'test-key' }));

      await sendVerificationOTP({ email: 'user@test.com', otp: '654321', type: 'sign-in' });

      expect(sendEmail).toHaveBeenCalledTimes(1);
      const [options] = (sendEmail as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(options.to).toBe('user@test.com');
      expect(options.subject).toContain('验证码');
      expect(options.body).toContain('654321');
    });

    it('封禁用户静默丢码，不发送任何邮件', async () => {
      dbMock.get.mockResolvedValue({ banned: true });
      const sendVerificationOTP = getOtpCallback(makeEnv({ SENDFLARE_KEY: 'test-key' }));

      await sendVerificationOTP({ email: 'banned@test.com', otp: '654321', type: 'sign-in' });

      expect(sendEmail).not.toHaveBeenCalled();
    });

    it('非 sign-in 类型不做任何处理', async () => {
      const sendVerificationOTP = getOtpCallback(makeEnv({ SENDFLARE_KEY: 'test-key' }));

      await sendVerificationOTP({ email: 'user@test.com', otp: '654321', type: 'email-verification' });

      expect(sendEmail).not.toHaveBeenCalled();
    });

    it('没有 SENDFLARE_KEY 时把验证码打印到控制台（本地冒烟用）', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const sendVerificationOTP = getOtpCallback(makeEnv());

      await sendVerificationOTP({ email: 'dev@test.com', otp: '123456', type: 'sign-in' });

      expect(sendEmail).not.toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('123456'));
      logSpy.mockRestore();
    });
  });
});
