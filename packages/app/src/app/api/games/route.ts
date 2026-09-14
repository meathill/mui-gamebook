import { NextRequest, NextResponse } from 'next/server';
import { getPublishedGames } from '@/lib/games';

/** 单页上限：构建期快照抓取按此分页，避免一次拉全表 */
export const GAMES_API_MAX_LIMIT = 100;

function parseLimit(raw: string | null): number | undefined {
  if (raw === null) return undefined;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) return undefined;
  return Math.min(value, GAMES_API_MAX_LIMIT);
}

function parseOffset(raw: string | null): number | undefined {
  if (raw === null) return undefined;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) return undefined;
  return value;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const games = await getPublishedGames({
    limit: parseLimit(params.get('limit')),
    offset: parseOffset(params.get('offset')),
  });
  return NextResponse.json(games);
}
