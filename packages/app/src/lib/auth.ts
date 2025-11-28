import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../db/schema';
import { getCloudflareContext } from '@opennextjs/cloudflare';

const { env } = getCloudflareContext();
export const auth = betterAuth({
  database: drizzleAdapter(drizzle(env.DB), {
    provider: 'sqlite',
    schema: schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  // We will restrict sign-up in the API route or via hooks
});
