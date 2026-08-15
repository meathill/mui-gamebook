import { notFound, redirect } from 'next/navigation';
import { generateMinigamesMetadata, MinigamesCatalog } from '../../minigames-catalog';

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
  return generateMinigamesMetadata(page);
}

export default async function MinigamesPagedPage({ params }: Props) {
  const page = Number((await params).page);
  if (!Number.isFinite(page) || page < 1) notFound();
  if (page === 1) redirect('/minigames');
  return <MinigamesCatalog page={page} />;
}
