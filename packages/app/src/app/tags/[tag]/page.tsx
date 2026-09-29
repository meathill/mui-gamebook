import { generateTagMetadata, TagCatalog } from './tag-catalog';

export const revalidate = 3600;
export const dynamicParams = true;

// 空数组 + dynamicParams：避免 generateStaticParams 触达 D1/no-store 回退把标签页钉成动态（issue #22）
export function generateStaticParams() {
  return [];
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
