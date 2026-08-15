import { notFound, redirect } from 'next/navigation';
import { BlogCatalog, generateBlogMetadata } from '../../../../blog-catalog';
import { blogCatalogHref } from '@/lib/catalog-path';

export const revalidate = 3600;
export const dynamicParams = true;

export function generateStaticParams() {
  return [];
}

type Props = {
  params: Promise<{ category: string; page: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { category, page } = await params;
  const n = Number(page);
  if (!Number.isFinite(n) || n < 1) return {};
  return generateBlogMetadata(category, n);
}

export default async function BlogCategoryPagedPage({ params }: Props) {
  const { category, page } = await params;
  const n = Number(page);
  if (!Number.isFinite(n) || n < 1) notFound();
  if (n === 1) redirect(blogCatalogHref(category, 1));
  return (
    <BlogCatalog
      category={category}
      page={n}
    />
  );
}
