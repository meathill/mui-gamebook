import { betterAuth } from 'better-auth';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { emailOTP } from 'better-auth/plugins';
import { apiKey } from '@better-auth/api-key';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema';
import { getPublicSiteUrl } from '@mui-gamebook/site-common/utils';
import { sendEmail } from './email';

/** OTP 验证码邮件（登录 / 注册合一） */
function buildOtpEmailBody(email: string, otp: string): string {
  return `
    <h2>登录验证码</h2>
    <p>你的登录验证码是：</p>
    <p style="font-size: 28px; font-weight: bold; letter-spacing: 6px;">${otp}</p>
    <p>验证码 5 分钟内有效，请勿告知他人。如果不是你本人操作，请忽略此邮件。</p>
    <p>—— 姆伊游戏书</p>
  `.trim();
}

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
  const rootEmail = process.env.NEXT_PUBLIC_ROOT_USER_EMAIL?.trim().toLowerCase();

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
        // 列表页要展示密钥末几位，创建时写入 metadata.tail
        enableMetadata: true,
        // better-auth 默认 10 次/24h，MCP/Agent 连续 tools/call 会把整把 key 打挂
        rateLimit: {
          enabled: true,
          timeWindow: 60_000,
          maxRequests: 120,
        },
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
      // 邮箱验证码登录 / 注册：邮箱可达 = 可封禁锚点（NSFW 治理）
      emailOTP({
        otpLength: 6,
        expiresIn: 300,
        allowedAttempts: 3,
        storeOTP: 'hashed',
        async sendVerificationOTP({ email, otp, type }) {
          if (type !== 'sign-in') return;
          // 封禁用户静默丢码：不暴露封禁状态，也不让封禁号收到任何邮件
          const user = await db
            .select({ banned: schema.user.banned })
            .from(schema.user)
            .where(eq(schema.user.email, email.toLowerCase()))
            .get();
          if (user?.banned) {
            console.warn(`[OTP] 封禁用户 ${email} 请求验证码，已静默丢弃`);
            return;
          }
          if (!env.SENDFLARE_KEY) {
            // 本地开发无发信密钥时打印验证码，便于冒烟
            console.log(`[OTP] SENDFLARE_KEY 未配置，${email} 的验证码：${otp}`);
            return;
          }
          await sendEmail(
            {
              to: email,
              subject: '登录验证码 - 姆伊游戏书',
              body: buildOtpEmailBody(email, otp),
            },
            env,
          );
        },
      }),
    ],
    // 密码登录仅保留 root 后门：邮件通道故障时 root 仍可应急登录；
    // 其余用户一律走 OTP。密码端点对非 root 直接拒绝，存量密码哈希不再 usable。
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== '/sign-in/email') return;
        const email = (ctx.body as { email?: string } | undefined)?.email?.trim().toLowerCase();
        if (!email || !rootEmail || email !== rootEmail) {
          throw new APIError('FORBIDDEN', { message: '密码登录已停用，请使用邮箱验证码登录' });
        }
      }),
    },
    databaseHooks: {
      session: {
        create: {
          // 封禁兜底：任何 session 创建路径（OTP / root 密码 / API key）都拒绝封禁用户
          before: async (session) => {
            const user = await db
              .select({ banned: schema.user.banned })
              .from(schema.user)
              .where(eq(schema.user.id, session.userId))
              .get();
            if (user?.banned) {
              throw new APIError('FORBIDDEN', { message: '账号已被封禁' });
            }
          },
        },
      },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
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
              <p>请点击下方链接验证你的邮箱：</p>
              <p><a href="${url}">${url}</a></p>
              <p>—— 姆伊游戏书</p>
            `.trim(),
          },
          env,
        );
      },
      // OTP 登录 / 注册本身已验证邮箱可达，注册时不再补发验证邮件
      sendOnSignUp: false,
      autoSignInAfterVerification: true,
    },
    // serverless 下内存限速不共享，落 D1；防 OTP 邮件轰炸与暴力猜码
    rateLimit: {
      enabled: true,
      storage: 'database',
      window: 60,
      max: 20,
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
