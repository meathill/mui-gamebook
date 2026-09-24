import { betterAuth } from 'better-auth';
import { apiKey } from '@better-auth/api-key';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../db/schema';
import { getPublicSiteUrl } from '@mui-gamebook/site-common/utils';
import { sendEmail } from './email';

export function createAuth(env: CloudflareEnv) {
  const db = drizzle(env.DB);
  const domain = env.COOKIE_DOMAIN || undefined;
  const siteUrl = getPublicSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
  // 允许的认证来源
  const trustedOrigins: string[] = [siteUrl];
  // wrangler.jsonc 里 TRUSTED_ORIGINS 默认值是 ""，wrangler types 会把它推断成字面量类型，
  // 真值判断后被收窄成 never，这里显式加宽类型
  const extraOrigins = env.TRUSTED_ORIGINS as string;
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
    user: {
      additionalFields: {
        // 内容管理员标记：随 session 下发，省掉各路由按 id 回查。
        // input: false —— 不能通过 better-auth 的注册/更新接口自行设置，只能在后台由 root 授予。
        isAdmin: {
          type: 'boolean',
          required: false,
          defaultValue: false,
          input: false,
        },
      },
    },
    plugins: [
      apiKey({
        defaultPrefix: 'mgb_',
        requireName: true,
        enableSessionForAPIKeys: true,
        // MCP / Agent 走标准 Authorization: Bearer；也兼容 x-api-key
        customAPIKeyGetter: (ctx) => {
          const req = ctx.request;
          if (!req) return null;
          const authorization = req.headers.get('Authorization');
          if (authorization?.startsWith('Bearer ')) {
            return authorization.slice('Bearer '.length).trim();
          }
          return req.headers.get('x-api-key');
        },
      }),
    ],
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
