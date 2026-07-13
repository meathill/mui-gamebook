/**
 * 有声书文本分段（CLI 侧薄封装）
 *
 * 判断"这句话是谁说的"的核心逻辑（prompt、校验、调用 chatWithTools）已经搬到
 * @mui-gamebook/core/lib/audiobook/segmentation，可以被 packages/app 复用。
 * 这里只保留 CLI 特有的部分：本地磁盘内容哈希缓存 + Game 类型适配。
 */
import { getAiProvider } from '../config';
import { addUsage } from '../usage';
import { generateCacheFileName, cacheExists, readCache, writeCache } from '../cache';
import {
  hasQuoteLikeCharacters,
  segmentTextWithProvider,
  validateSegments,
} from '@mui-gamebook/core/lib/audiobook/segmentation';
import { NARRATOR_SPEAKER_ID, type RawSegment } from '@mui-gamebook/core/lib/audiobook/types';
import type { SegmentationContext } from './types';

export { validateSegments };

/**
 * 把一段场景正文分段成 { speaker, text } 的有序列表
 *
 * 没有引号类字符时直接判定整段是旁白，不调用 LLM；LLM 结果不合法（或调用失败）时
 * 同样退化为单一旁白分段，不会让整个节点失败。分段结果按内容哈希缓存，与音频生成
 * 缓存相互独立——不合法的结果不写入缓存，下次非 --force 运行时还会重新尝试。
 */
export async function segmentText(content: string, context: SegmentationContext): Promise<RawSegment[]> {
  if (!hasQuoteLikeCharacters(content)) {
    return [{ speaker: NARRATOR_SPEAKER_ID, text: content }];
  }

  const gameSlug = context.game.slug;
  const roster = context.game.ai?.characters || {};
  const rosterIds = Object.keys(roster);
  const cacheFileName = generateCacheFileName(context.sceneId, context.nodeIndex, 'segments', content, 'json');

  if (cacheExists(gameSlug, cacheFileName)) {
    const cached = readCache(gameSlug, cacheFileName);
    if (cached) {
      try {
        const validated = validateSegments(JSON.parse(cached.toString('utf-8')), rosterIds, content);
        if (validated) return validated;
      } catch {
        // 缓存文件损坏，忽略并重新生成
      }
    }
  }

  const provider = getAiProvider();
  if (!provider.chatWithTools) {
    console.warn(
      `[Audiobook] 当前 provider（${provider.type}）不支持 function calling，场景 ${context.sceneId} 节点 #${context.nodeIndex} 退化为单一旁白分段`,
    );
  }

  const result = await segmentTextWithProvider(provider, content, {
    roster,
    sceneId: context.sceneId,
    nodeIndex: context.nodeIndex,
    precedingExcerpt: context.precedingExcerpt,
  });

  if (result.usage) {
    addUsage(result.usage);
  }

  if (!result.validated) {
    console.warn(
      `[Audiobook] 场景 ${context.sceneId} 节点 #${context.nodeIndex}：分段未通过校验或调用失败，退化为单一旁白分段`,
    );
    return result.segments;
  }

  // 缓存里存的形状要跟 LLM 原始 function-call args 一致（{ segments: [...] }），
  // 这样读缓存和读 LLM 结果都能走同一套 validateSegments 校验逻辑
  writeCache(gameSlug, cacheFileName, Buffer.from(JSON.stringify({ segments: result.segments }), 'utf-8'));
  return result.segments;
}
