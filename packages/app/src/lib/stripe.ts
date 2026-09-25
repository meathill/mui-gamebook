import Stripe from 'stripe';

export function getStripe(env: CloudflareEnv): Stripe {
  const secretKey = env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('未配置 STRIPE_SECRET_KEY');
  }
  // 不缓存实例：密钥轮换 / 测试注入不同 env 时避免绑死旧 secret
  // Workers 没有 node:https，必须用 fetch 版 HTTP client，否则所有 API 调用直接抛错（checkout 500 的根因）
  return new Stripe(secretKey, {
    appInfo: { name: 'mui-gamebook', version: '0.9.0' },
    httpClient: Stripe.createFetchHttpClient(),
  });
}

export function getStripeWebhookSecret(env: CloudflareEnv): string {
  const secret = env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('未配置 STRIPE_WEBHOOK_SECRET');
  }
  return secret;
}
