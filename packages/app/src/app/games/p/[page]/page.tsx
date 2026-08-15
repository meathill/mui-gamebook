import { notFound, redirect } from 'next/navigation';
import { generateGamesMetadata, GamesCatalog } from '../../games-catalog';

export const revalidate = 3600;
export const dynamicParams = true;

export function generateStaticParams() {
  return [];
}

type Props = {
  params: Promise<{ page: string }>;
};

export async function generateMetadata({ params }: Props) {
  const page = Number((await params).page);
  if (!Number.isFinite(page) || page < 1) return {};
  return generateGamesMetadata(page);
}

export default async function GamesPagedPage({ params }: Props) {
  const page = Number((await params).page);
  if (!Number.isFinite(page) || page < 1) notFound();
  if (page === 1) redirect('/games');
  return <GamesCatalog page={page} />;
}
