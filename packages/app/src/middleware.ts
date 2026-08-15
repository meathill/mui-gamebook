import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { legacyCatalogRedirect } from '@/lib/catalog-path';

export function middleware(request: NextRequest) {
  const target = legacyCatalogRedirect(request.nextUrl.pathname, {
    page: request.nextUrl.searchParams.get('page'),
    category: request.nextUrl.searchParams.get('category'),
  });

  if (!target || target === request.nextUrl.pathname) {
    if (target === request.nextUrl.pathname && request.nextUrl.search) {
      return NextResponse.redirect(new URL(target, request.url), 308);
    }
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL(target, request.url), 308);
}

export const config = {
  matcher: ['/games', '/minigames', '/blog', '/tags/:tag'],
};
