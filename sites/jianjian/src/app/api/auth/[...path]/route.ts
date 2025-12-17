import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3020';

type Props = {
  params: Promise<{ path: string[] }>;
};

/**
 * 代理所有认证请求到 CMS
 * 这样独立站点可以使用 CMS 的认证系统
 */
export async function GET(request: NextRequest, props: Props) {
  return proxyAuthRequest(request, props);
}

export async function POST(request: NextRequest, props: Props) {
  return proxyAuthRequest(request, props);
}

async function proxyAuthRequest(request: NextRequest, props: Props) {
  try {
    const { path } = await props.params;
    const pathString = path.join('/');
    const url = new URL(request.url);

    // 构建代理 URL
    const proxyUrl = new URL(`/api/auth/${pathString}`, API_URL);
    proxyUrl.search = url.search;

    // 转发请求到 CMS
    const proxyRequest = new Request(proxyUrl.toString(), {
      method: request.method,
      headers: request.headers,
      body: request.body,
      // @ts-expect-error - duplex is required for streaming
      duplex: 'half',
    });

    const response = await fetch(proxyRequest);

    // 创建响应，保留所有头部（包括 Set-Cookie）
    const proxyResponse = new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });

    return proxyResponse;
  } catch (error) {
    console.error('Auth proxy error:', error);
    return NextResponse.json({ error: '认证服务暂时不可用' }, { status: 500 });
  }
}
