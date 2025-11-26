import { toNextJsHandler } from 'better-auth/next-js';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { createAuth } from '@/lib/auth-config';

const handler = toNextJsHandler(async (req) => {
  const { env } = await getCloudflareContext();
  const auth = createAuth(env);
  return auth.handler(req);
});

export const { GET, POST } = handler;
