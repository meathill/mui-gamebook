import { BlogCatalog, generateBlogMetadata } from './blog-catalog';

export const revalidate = 3600;

export function generateMetadata() {
  return generateBlogMetadata(undefined, 1);
}

export default function BlogPage() {
  return <BlogCatalog page={1} />;
}
