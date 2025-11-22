import { NextResponse } from 'next/server';
import { getPublishedGames } from '@/lib/games';

export async function GET() {
  const games = await getPublishedGames();
  return NextResponse.json(games);
}
