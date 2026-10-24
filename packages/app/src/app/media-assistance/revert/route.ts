import { getCloudflareContext } from '@opennextjs/cloudflare';
import { revertAssistance, verifyRevertToken } from '@/lib/media-assistance/revert';
import { AssistanceError } from '@/lib/media-assistance/types';

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

function page(title: string, body: string, status = 200) {
  return new Response(
    `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>${escapeHtml(title)} - 姆伊游戏书</title>
<style>body{font-family:system-ui,sans-serif;max-width:560px;margin:48px auto;padding:0 16px;line-height:1.7;color:#333}
button{background:#c2410c;color:#fff;border:0;border-radius:6px;padding:10px 20px;font-size:16px;cursor:pointer}</style></head>
<body><h1>${escapeHtml(title)}</h1>${body}<p style="color:#888">—— 姆伊游戏书</p></body></html>`,
    {
      status,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'Referrer-Policy': 'no-referrer',
        'X-Robots-Tag': 'noindex',
      },
    },
  );
}

function errorPage(error: unknown) {
  if (error instanceof AssistanceError) return page('无法撤回', `<p>${escapeHtml(error.message)}</p>`, error.status);
  console.error('素材协助撤回失败', error);
  return page('撤回失败', '<p>服务器暂时出错，请稍后再试，或直接回复邮件联系我们。</p>', 500);
}

/** GET 只展示确认页，避免邮箱客户端预取链接时误触发撤回。 */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token') ?? '';
  try {
    const { env } = getCloudflareContext();
    const gameId = await verifyRevertToken(env.MEDIA_ASSISTANCE_REVERT_SECRET ?? '', token);
    const game = await env.DB.prepare('SELECT title FROM Games WHERE id = ?').bind(gameId).first<{ title: string }>();
    if (!game) throw new AssistanceError('作品不存在', 404);
    return page(
      '撤回站方 AI 素材',
      `<p>确认后，我们会移除站方为《${escapeHtml(game.title)}》添加的全部 AI 素材，并且不再为这部作品生成素材。</p>
<p>你自己添加或修改过的素材不会受影响，剧情文字也不会被改动。</p>
<form method="post"><input type="hidden" name="token" value="${escapeHtml(token)}"><button type="submit">确认撤回</button></form>`,
    );
  } catch (error) {
    return errorPage(error);
  }
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const token = String(form.get('token') ?? '');
    const { env } = getCloudflareContext();
    const gameId = await verifyRevertToken(env.MEDIA_ASSISTANCE_REVERT_SECRET ?? '', token);
    const result = await revertAssistance(env.DB, gameId, env.ASSETS_BUCKET);
    return page(
      '已撤回',
      `<p>《${escapeHtml(result.title)}》中由站方添加的 AI 素材已移除（${result.reverted} 项），站方之后不会再处理这部作品。</p>
<p>如果以后改变主意，可以在编辑器的游戏设置中重新开启「接受站方 AI 素材协助」。</p>`,
    );
  } catch (error) {
    return errorPage(error);
  }
}
