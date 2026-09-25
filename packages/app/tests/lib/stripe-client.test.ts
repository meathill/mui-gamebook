import { describe, expect, it } from 'vitest';
import { getStripe, getStripeWebhookSecret } from '@/lib/stripe';

function fakeEnv(secretKey = 'sk_test_123'): CloudflareEnv {
  return { STRIPE_SECRET_KEY: secretKey, STRIPE_WEBHOOK_SECRET: 'whsec_123' } as CloudflareEnv;
}

describe('getStripe', () => {
  it('缺 secret 时抛错（checkout 转 500 前先有明确信息）', () => {
    expect(() => getStripe({} as CloudflareEnv)).toThrow('未配置 STRIPE_SECRET_KEY');
  });

  it('Workers 下必须用 fetch 版 HTTP client（默认 Node client 发不出请求）', () => {
    const stripe = getStripe(fakeEnv());
    const httpClient = (
      stripe as unknown as { getApiField: (k: string) => { constructor: { name: string } } }
    ).getApiField('httpClient');
    expect(httpClient.constructor.name).toContain('Fetch');
  });

  it('每次返回新实例（密钥轮换不绑死旧 secret）', () => {
    expect(getStripe(fakeEnv('sk_a'))).not.toBe(getStripe(fakeEnv('sk_b')));
  });
});

describe('getStripeWebhookSecret', () => {
  it('缺 secret 时抛错', () => {
    expect(() => getStripeWebhookSecret({} as CloudflareEnv)).toThrow('未配置 STRIPE_WEBHOOK_SECRET');
  });

  it('正常返回 secret', () => {
    expect(getStripeWebhookSecret(fakeEnv())).toBe('whsec_123');
  });
});
