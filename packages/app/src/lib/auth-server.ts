import { getCloudflareContext } from '@opennextjs/cloudflare';
import { createAuth } from '@/lib/auth-config';
import { headers } from 'next/headers';

export async function getSession() {
  const { env } = getCloudflareContext();
  const auth = createAuth(env);
  return auth.api.getSession({
    headers: await headers(),
  });
}
