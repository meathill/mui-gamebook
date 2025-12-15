import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../db/schema';

export function createAuth(env: CloudflareEnv) {
  const db = drizzle(env.DB);
  const domain = env.COOKIE_DOMAIN || undefined; // 例如 '.jianjian.com'
  return betterAuth({
    baseURL: env.NEXT_PUBLIC_SITE_URL,
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
