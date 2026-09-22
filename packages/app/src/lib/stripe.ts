import Stripe from 'stripe';

let stripeClient: Stripe | null = null;

export function getStripe(env: CloudflareEnv): Stripe {
  const secretKey = env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('未配置 STRIPE_SECRET_KEY');
  }
  if (!stripeClient) {
    stripeClient = new Stripe(secretKey, {
      appInfo: { name: 'mui-gamebook', version: '0.9.0' },
    });
  }
  return stripeClient;
}

export function getStripeWebhookSecret(env: CloudflareEnv): string {
  const secret = env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('未配置 STRIPE_WEBHOOK_SECRET');
  }
  return secret;
}
