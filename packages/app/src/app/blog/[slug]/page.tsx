import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeftIcon, CalendarIcon, TagIcon } from 'lucide-react';
import { getPostBySlug, getCategoryLabel } from '@/lib/blog';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: 'Not Found' };

  return {
    title: `${post.title} - 姆伊游戏书博客`,
    description: post.description,
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-white">
      <article className="max-w-3xl mx-auto px-4 py-12">
        {/* Back link */}
        <Link
          href="/blog"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-8 transition-colors">
          <ArrowLeftIcon className="w-4 h-4" />
          返回博客
        </Link>

        {/* Article header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 leading-tight">{post.title}</h1>
          {post.description && <p className="mt-3 text-lg text-gray-600">{post.description}</p>}
          <div className="flex items-center gap-4 mt-4 text-sm text-gray-400">
            {post.publishedAt && (
              <span className="flex items-center gap-1">
                <CalendarIcon className="w-4 h-4" />
                {new Date(post.publishedAt).toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            )}
            {post.category && (
              <span className="flex items-center gap-1">
                <TagIcon className="w-4 h-4" />
                {getCategoryLabel(post.category)}
              </span>
            )}
            {post.author && <span>{post.author}</span>}
          </div>
        </header>

        {/* Cover image */}
        {post.coverUrl && (
          <img
            src={post.coverUrl}
            alt={post.title}
            className="w-full rounded-lg mb-8 border border-gray-200"
          />
        )}

        {/* Content */}
        <div className="prose prose-gray max-w-none">
          {post.content ? (
            <RichTextContent content={post.content} />
          ) : (
            <p className="text-gray-500">文章内容加载中...</p>
          )}
        </div>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex gap-2 mt-8 pt-8 border-t border-gray-200">
            {post.tags.map(({ tag }, i) => (
              <span
                key={i}
                className="px-3 py-1 text-xs text-gray-600 bg-gray-100 rounded-lg">
                {tag}
              </span>
            ))}
          </div>
        )}
      </article>
    </div>
  );
}

/**
 * Simple Lexical rich text renderer.
 * Payload stores content as Lexical JSON. This is a basic renderer
 * that handles common node types. For production, consider using
 * @payloadcms/richtext-lexical/react for full support.
 */
function RichTextContent({ content }: { content: unknown }) {
  if (!content || typeof content !== 'object') return null;

  const root = content as { root?: { children?: unknown[] } };
  if (!root.root?.children) return null;

  return (
    <>
      {root.root.children.map((node: any, i: number) => (
        <RichTextNode
          key={i}
          node={node}
        />
      ))}
    </>
  );
}

function RichTextNode({ node }: { node: any }) {
  if (!node) return null;

  switch (node.type) {
    case 'paragraph':
      return <p>{renderChildren(node.children)}</p>;
    case 'heading':
      const Tag = `h${node.tag || 2}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
      return <Tag>{renderChildren(node.children)}</Tag>;
    case 'list':
      if (node.listType === 'number') {
        return <ol>{renderChildren(node.children)}</ol>;
      }
      return <ul>{renderChildren(node.children)}</ul>;
    case 'listitem':
      return <li>{renderChildren(node.children)}</li>;
    case 'quote':
      return <blockquote>{renderChildren(node.children)}</blockquote>;
    case 'horizontalrule':
      return <hr />;
    default:
      if (node.children) {
        return <>{renderChildren(node.children)}</>;
      }
      return null;
  }
}

function renderChildren(children: any[]): React.ReactNode {
  if (!children) return null;
  return children.map((child: any, i: number) => {
    if (child.type === 'text') {
      let text: React.ReactNode = child.text;
      if (child.format & 1) text = <strong key={i}>{text}</strong>;
      if (child.format & 2) text = <em key={i}>{text}</em>;
      if (child.format & 8) text = <code key={i}>{text}</code>;
      return <span key={i}>{text}</span>;
    }
    if (child.type === 'link') {
      return (
        <a
          key={i}
          href={child.fields?.url}
          target="_blank"
          rel="noopener noreferrer">
          {renderChildren(child.children)}
        </a>
      );
    }
    return (
      <RichTextNode
        key={i}
        node={child}
      />
    );
  });
}
