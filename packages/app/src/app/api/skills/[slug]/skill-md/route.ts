import { NextResponse } from 'next/server';
import { getSkillDownload } from '@/lib/skills';

/** GET /api/skills/[slug]/skill-md → 标准 SKILL.md 纯文本下载（页面展示的是同一字符串）。 */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const download = getSkillDownload(slug);
  if (!download) {
    return NextResponse.json({ error: `Unknown skill: ${slug}` }, { status: 404 });
  }
  return new NextResponse(download.markdown, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="${download.fileName}"`,
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
