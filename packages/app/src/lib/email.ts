/**
 * Sendflare 邮件发送服务
 * API 文档: https://docs.sendflare.com/docs/api/integration/
 */

const SENDFLARE_API = 'https://api.sendflare.com/v1/send';

interface SendEmailOptions {
  to: string;
  subject: string;
  body: string;
  from?: string;
}

interface SendflareResponse {
  requestId: string;
  code: number;
  success: boolean;
  message: string;
}

export async function sendEmail(options: SendEmailOptions, env: CloudflareEnv): Promise<void> {
  const { to, subject, body, from } = options;
  const apiKey = env.SENDFLARE_KEY;
  if (!apiKey) {
    console.warn('SENDFLARE_KEY not configured, skipping email send');
    return;
  }

  const senderEmail = from || env.SENDER_EMAIL || 'noreply@muistory.com';

  const res = await fetch(SENDFLARE_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: senderEmail,
      to,
      subject,
      body,
    }),
  });

  if (!res.ok) {
    throw new Error(`Sendflare API error: ${res.status} ${res.statusText}`);
  }

  const data: SendflareResponse = await res.json();
  if (!data.success) {
    throw new Error(`Sendflare send failed: ${data.message}`);
  }
}
