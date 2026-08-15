import { notFound, redirect } from 'next/navigation';
import { generateTagMetadata, TagCatalog } from '../../tag-catalog';

export const revalidate = 3600;
export const dynamicParams = true;

export function generateStaticParams() {
  return [];
}

type Props = {
  params: Promise<{ tag: string; page: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { tag, page } = await params;
  const n = Number(page);
  if (!Number.isFinite(n) || n < 1) return {};
  return generateTagMetadata(tag, n);
}

export default async function TagPagedPage({ params }: Props) {
  const { tag, page } = await params;
  const n = Number(page);
  if (!Number.isFinite(n) || n < 1) notFound();
  if (n === 1) redirect(`/tags/${tag}`);
  return (
    <TagCatalog
      tag={tag}
      page={n}
    />
  );
}
