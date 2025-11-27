import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { createAuth } from '@/lib/auth-config';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import * as schema from '@/db/schema';

export async function POST(req: Request) {
  try {
    const { env } = getCloudflareContext();
    const secret = env.ADMIN_SECRET || process.env.ADMIN_SECRET;

    // Security Check
    const authHeader = req.headers.get('Authorization');
    if (!secret || authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { email, password, name } = body as {
      email: string;
      password: string;
      name: string;
    };

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Create auth instance with hooks disabled
    const auth = createAuth(env, { disableHooks: true });

    // Use better-auth API to sign up
    const res = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name,
      },
      asResponse: false // We want the user object, not a Response
    });

    if (res?.user?.id) {
      // Automatically verify email for admin-invited users
      const db = drizzle(env.DB);
      await db.update(schema.user)
        .set({ emailVerified: true })
        .where(eq(schema.user.id, res.user.id));

      // Update the returned user object to reflect the change
      res.user.emailVerified = true;
    }

    return NextResponse.json(res);
  } catch (e: unknown) {
    console.error('Invite failed:', e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
