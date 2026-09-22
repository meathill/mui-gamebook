import { createAuthClient } from 'better-auth/react';
import { apiKeyClient } from '@better-auth/api-key/client';

export const authClient = createAuthClient({
  plugins: [apiKeyClient()],
});

export function isRootUserClient(email: string | undefined): boolean {
  if (!email) return false;
  const rootEmails = process.env.NEXT_PUBLIC_ROOT_USER_EMAIL?.split(',').map((e) => e.trim().toLowerCase()) || [];
  return rootEmails.includes(email.toLowerCase());
}
