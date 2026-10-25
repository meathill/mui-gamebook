import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getPublicSiteUrl } from '@mui-gamebook/site-common/utils';
import { sendEmail } from '@/lib/email';
import { revalidatePublicCatalog } from '@/lib/public-cache';
import type { McpActor } from '@/lib/mcp-agent/shared';
import { applyAsset } from './apply';
import { requireAssistanceAdmin } from './auth';
import { claimItem, updateItem } from './generation';
import { savePlan } from './plan';
import { AssistanceError } from './types';
import { claimWork, finishWork } from './work';

export async function executeAssistanceTool(name: string, args: Record<string, unknown>, actor: McpActor) {
  try {
    const db = getCloudflareContext().env.DB;
    await requireAssistanceAdmin(db, actor.mode, actor.user.id);
    const gameId = Number(args.gameId);
    if (name !== 'claimMediaAssistanceWork' && (!Number.isInteger(gameId) || gameId <= 0))
      throw new AssistanceError('gameId 无效', 400);
    let data: Record<string, unknown>;
    switch (name) {
      case 'claimMediaAssistanceWork':
        data = await claimWork(db);
        break;
      case 'saveMediaAssistancePlan':
        data = await savePlan(db, gameId, Number(args.revision), args.items, args.planningComplete !== false);
        break;
      case 'claimMediaAssistanceItem':
        data = await claimItem(db, gameId, String(args.assetId ?? ''), String(args.requestId ?? ''));
        break;
      case 'updateMediaAssistanceItem':
        data = await updateItem(db, gameId, String(args.inputHash ?? ''), args);
        break;
      case 'applyMediaAssistanceAsset': {
        const result = await applyAsset(db, gameId, String(args.assetId ?? ''), String(args.inputHash ?? ''));
        if ('slug' in result) revalidatePublicCatalog({ slug: result.slug, tags: result.tags });
        data = result;
        break;
      }
      case 'finishMediaAssistanceWork':
        data = await finishWork(db, gameId, {
          siteUrl: getPublicSiteUrl(process.env.NEXT_PUBLIC_SITE_URL),
          revertSecret: getCloudflareContext().env.MEDIA_ASSISTANCE_REVERT_SECRET,
          send: (message) => sendEmail(message, getCloudflareContext().env),
        });
        break;
      default:
        throw new AssistanceError('未知素材协助工具', 400);
    }
    return { ok: true, message: '素材协助操作完成', data };
  } catch (error) {
    if (!(error instanceof AssistanceError)) throw error;
    return { ok: false, message: error.message, data: { status: error.status } };
  }
}
