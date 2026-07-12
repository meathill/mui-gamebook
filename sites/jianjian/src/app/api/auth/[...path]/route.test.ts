import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../lib/config', () => ({
  CMS_API_URL: 'https://cms.example.com',
}));

const fetchMock = vi.fn<typeof fetch>();

import { GET, POST } from './route';

function jsonUpstream(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json', 'set-cookie': 'session=abc123' },
    }),
  );
}

describe('GET/POST /api/auth/[...path] (jianjian 代理到 CMS)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('GET 请求代理到 CMS_API_URL，保留路径和 query string', async () => {
    fetchMock.mockResolvedValue(await jsonUpstream({ user: null }));
    const req = new NextRequest('http://localhost/api/auth/get-session?foo=bar');

    const res = await GET(req, { params: Promise.resolve({ path: ['get-session'] }) });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://cms.example.com/api/auth/get-session?foo=bar', method: 'GET' }),
    );
    expect(res.status).toBe(200);
  });

  it('POST 请求转发方法和请求体', async () => {
    fetchMock.mockResolvedValue(await jsonUpstream({ success: true }));
    const req = new NextRequest('http://localhost/api/auth/sign-in/email', {
      method: 'POST',
      body: JSON.stringify({ email: 'a@x.com', password: '123456' }),
    });

    const res = await POST(req, { params: Promise.resolve({ path: ['sign-in', 'email'] }) });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://cms.example.com/api/auth/sign-in/email', method: 'POST' }),
    );
    expect(res.status).toBe(200);
  });

  it('保留上游响应的状态码和 Set-Cookie 头', async () => {
    fetchMock.mockResolvedValue(await jsonUpstream({ error: 'invalid' }, 401));
    const req = new NextRequest('http://localhost/api/auth/get-session');

    const res = await GET(req, { params: Promise.resolve({ path: ['get-session'] }) });

    expect(res.status).toBe(401);
    expect(res.headers.get('set-cookie')).toBe('session=abc123');
  });

  it('代理请求异常时返回 500', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));
    const req = new NextRequest('http://localhost/api/auth/get-session');

    const res = await GET(req, { params: Promise.resolve({ path: ['get-session'] }) });
    const data = (await res.json()) as { error: string };

    expect(res.status).toBe(500);
    expect(data.error).toBe('认证服务暂时不可用');
  });
});
