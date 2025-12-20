import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../db/schema';

export function createAuth(env: CloudflareEnv) {
  const db = drizzle(env.DB);
  const domain = env.COOKIE_DOMAIN || undefined; // 例如 '.jianjian.com'
  // 允许的认证来源
  const trustedOrigins: string[] = [env.NEXT_PUBLIC_SITE_URL];
  const extraOrigins = env.TRUSTED_ORIGINS;
  if (extraOrigins) {
    trustedOrigins.push(...extraOrigins.split(',').map((o: string) => o.trim()));
  }

  return betterAuth({
    baseURL: env.NEXT_PUBLIC_SITE_URL,
    trustedOrigins,
    database: drizzleAdapter(db, {
      provider: 'sqlite',
      schema: schema,
    }),
    emailAndPassword: {
      enabled: true,
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
