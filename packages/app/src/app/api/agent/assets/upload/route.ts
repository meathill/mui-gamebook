import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

/**
 * 验证管理员密钥
 */
function validateAdminAuth(req: Request, env: { ADMIN_PASSWORD?: string }): boolean {
  const secret = env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
  const authHeader = req.headers.get('Authorization');
  return !!(secret && authHeader === `Bearer ${secret}`);
}

/**
 * POST /api/agent/assets/upload
 * 上传图片到 R2（供 AI Agent 使用）
 *
 * 接收 base64 编码的图片数据
 */
export async function POST(req: Request) {
  const { env } = getCloudflareContext();

  if (!validateAdminAuth(req, env)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { gameSlug, fileName, base64, contentType } = (await req.json()) as {
      gameSlug: string;
      fileName: string;
      base64: string;
      contentType: string;
    };

    if (!gameSlug || !fileName || !base64 || !contentType) {
      return NextResponse.json(
        { error: 'Missing required fields: gameSlug, fileName, base64, contentType' },
        { status: 400 },
      );
    }

    const bucket = env.ASSETS_BUCKET;
    if (!bucket) {
      throw new Error("R2 Bucket 'ASSETS_BUCKET' not found");
    }

    // 解码 base64 数据
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // 生成唯一文件路径
    const filePath = `images/${gameSlug}/${Date.now()}-${fileName}`;

    // 上传到 R2
    await bucket.put(filePath, bytes.buffer, {
      httpMetadata: { contentType },
    });

    // 返回公开 URL
    const publicDomain = env.ASSETS_PUBLIC_DOMAIN || process.env.ASSETS_PUBLIC_DOMAIN;
    const url = `${publicDomain}/${filePath}`;

    return NextResponse.json({ url });
  } catch (e: unknown) {
    console.error('Upload error:', e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
