import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "../db/schema";

export function createAuth(env: any, options: { disableHooks?: boolean } = {}) {
  const db = drizzle(env.DB);
  return betterAuth({
    baseURL: process.env.NEXT_PUBLIC_SITE_URL,
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: schema,
    }),
    emailAndPassword: {
      enabled: true,
    },
  });
}
