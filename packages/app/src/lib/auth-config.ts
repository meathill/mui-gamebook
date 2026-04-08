import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../db/schema';
import { sendEmail } from './email';

export function createAuth(env: CloudflareEnv) {
  const db = drizzle(env.DB);
  const domain = env.COOKIE_DOMAIN || undefined;
  const siteUrl = env.NEXT_PUBLIC_SITE_URL;
  // 允许的认证来源
  const trustedOrigins: string[] = [siteUrl];
  const extraOrigins = env.TRUSTED_ORIGINS;
  if (extraOrigins) {
    trustedOrigins.push(...extraOrigins.split(',').map((o: string) => o.trim()));
  }

  return betterAuth({
    baseURL: siteUrl,
    trustedOrigins,
    database: drizzleAdapter(db, {
      provider: 'sqlite',
      schema: schema,
    }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      sendResetPassword: async ({ user, url }) => {
        await sendEmail(
          {
            to: user.email,
            subject: '重置密码 - 姆伊游戏书',
            body: `
              <h2>重置密码</h2>
              <p>你好${user.name ? '，' + user.name : ''}！</p>
              <p>你请求重置密码，请点击下方链接：</p>
              <p><a href="${url}">${url}</a></p>
              <p>如果你没有请求重置密码，请忽略此邮件。</p>
              <p>—— 姆伊游戏书</p>
            `.trim(),
          },
          env,
        );
      },
    },
    emailVerification: {
      sendVerificationEmail: async ({ user, url }) => {
        await sendEmail(
          {
            to: user.email,
            subject: '验证邮箱 - 姆伊游戏书',
            body: `
              <h2>验证邮箱</h2>
              <p>你好${user.name ? '，' + user.name : ''}！</p>
              <p>欢迎加入姆伊游戏书，请点击下方链接验证你的邮箱：</p>
              <p><a href="${url}">${url}</a></p>
              <p>—— 姆伊游戏书</p>
            `.trim(),
          },
          env,
        );
      },
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
    },
    // 跨子域 Cookie 配置
    advanced: {
      crossSubDomainCookies: domain
        ? {
            enabled: true,
            domain: domain,
          }
        : undefined,
    },
  });
}
