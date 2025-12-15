import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const id = formData.get('id') as string;
    const type = formData.get('type') as string;

    if (!file || !id) {
      return NextResponse.json({ error: 'Missing file or id' }, { status: 400 });
    }

    const { env } = getCloudflareContext();
    const bucket = env.ASSETS_BUCKET;
    if (!bucket) throw new Error("R2 Bucket 'ASSETS_BUCKET' not found");

    const buffer = await file.arrayBuffer();
    const fileName = `images/${id}/${type}-${Date.now()}-${file.name}`;

    await bucket.put(fileName, buffer, {
      httpMetadata: { contentType: file.type },
    });

    const publicDomain = env.ASSETS_PUBLIC_DOMAIN || process.env.ASSETS_PUBLIC_DOMAIN;
    const url = `${publicDomain}/${fileName}`;

    return NextResponse.json({ url });
  } catch (e: unknown) {
    console.error('Upload error:', e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
