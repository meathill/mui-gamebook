import { getAllTags } from '@/lib/games';
import { generateTagMetadata, TagCatalog } from './tag-catalog';

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const tags = await getAllTags();
    return tags.map((item) => ({ tag: item.tag }));
  } catch {
    return [];
  }
}

type Props = {
  params: Promise<{ tag: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { tag } = await params;
  return generateTagMetadata(tag, 1);
}

export default async function TagPage({ params }: Props) {
  const { tag } = await params;
  return (
    <TagCatalog
      tag={tag}
      page={1}
    />
  );
}
