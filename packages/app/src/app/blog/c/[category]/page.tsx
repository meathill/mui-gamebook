import { BlogCatalog, generateBlogMetadata } from '../../blog-catalog';

export const revalidate = 3600;
export const dynamicParams = true;

export function generateStaticParams() {
  return ['update', 'tutorial', 'story', 'insight'].map((category) => ({ category }));
}

type Props = {
  params: Promise<{ category: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { category } = await params;
  return generateBlogMetadata(category, 1);
}

export default async function BlogCategoryPage({ params }: Props) {
  const { category } = await params;
  return (
    <BlogCatalog
      category={category}
      page={1}
    />
  );
}
