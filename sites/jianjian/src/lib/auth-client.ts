import { createAuthClient } from 'better-auth/react';
import { CMS_API_URL } from './config';

export const authClient = createAuthClient({
  baseURL: CMS_API_URL,
});
