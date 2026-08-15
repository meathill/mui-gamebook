import { notFound, redirect } from 'next/navigation';
import { BlogCatalog, generateBlogMetadata } from '../../blog-catalog';

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
  return generateBlogMetadata(undefined, page);
}

export default async function BlogPagedPage({ params }: Props) {
  const page = Number((await params).page);
  if (!Number.isFinite(page) || page < 1) notFound();
  if (page === 1) redirect('/blog');
  return <BlogCatalog page={page} />;
}
