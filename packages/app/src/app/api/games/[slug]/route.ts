import { NextResponse } from 'next/server';
import { getGameBySlug } from '@/lib/games';

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const { slug } = await params;
  const game = getGameBySlug(slug);

  if (!game) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }

  return NextResponse.json(game);
}
