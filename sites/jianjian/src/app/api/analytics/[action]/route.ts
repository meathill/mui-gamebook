import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export async function POST(request: Request, { params }: { params: Promise<{ action: string }> }) {
  try {
    const { action } = await params;
    const { env } = getCloudflareContext();

    // @ts-expect-error MAIN_APP might not be in the generated types yet
    const mainApp = env.MAIN_APP as Fetcher;

    if (!mainApp) {
      console.error('MAIN_APP service binding not found');
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    const body = await request.json();

    // Use allowed actions whitelist for security
    const allowedActions = ['open', 'scene', 'choice', 'complete'];
    if (!allowedActions.includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const response = await mainApp.fetch(`http://internal/api/analytics/${action}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error(`Upstream error: ${response.status}`);
      return NextResponse.json({ error: 'Upstream error' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Analytics proxy error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
