import { createAuthClient } from 'better-auth/react';

export const authClient = await (async function () {
  return createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_API_URL,
  });
})();
