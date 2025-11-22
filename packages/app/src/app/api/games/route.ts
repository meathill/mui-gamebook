import { NextResponse } from 'next/server';
import { getPublishedGames } from '@/lib/games';

export async function GET() {
  const games = getPublishedGames();
  return NextResponse.json(games);
}
