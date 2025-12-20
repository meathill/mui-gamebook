import { createAuthClient } from 'better-auth/react';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export const authClient = await (async function () {
  const { env } = await getCloudflareContext({ async: true });
  return createAuthClient({
    baseURL: env.NEXT_PUBLIC_API_URL,
  });
})();
