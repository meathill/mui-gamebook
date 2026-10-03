/**
 * MCP Agent 工具：AI 生成（generateScript/generateImage）。
 * generateScript 是"生成 → 校验 → 一次纠错重生成"的闭环。
 */
import { parse } from '@roudanio/parser';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import { generateAndUploadImage } from '@/lib/ai-service';
import { getUserAiPermissions, resolveTextProvider } from '@/lib/ai-permissions';
import { createAiProvider } from '@/lib/ai-provider-factory';
import { recordAiUsage } from '@/lib/ai-usage';
import { getConfig } from '@/lib/config';
import {
  buildCorrectionPrompt,
  buildGenerateScriptPrompt,
  buildReviseScriptPrompt,
  hasSubstantialScript,
  stripCodeFence,
  trimDslSpecForFirstPass,
  validateGeneratedScript,
} from '@/lib/editor/generate-script';
import { checkUserUsageLimit } from '@/lib/usage-limit';
import { type McpGameContext, type McpToolOutcome, fail, ok, writeGameContent } from './shared';

async function fetchDslSpec(): Promise<string> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://muistory.com';
  const res = await fetch(`${base.replace(/\/$/, '')}/DSL_SPEC.md`);
  if (!res.ok) throw new Error(`拉取 DSL_SPEC 失败: ${res.status}`);
  return res.text();
}

async function runTextGeneration(
  prompt: string,
  providerType: string,
): Promise<{
  text: string;
  model: string;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
}> {
  const provider = await createAiProvider(providerType as Parameters<typeof createAiProvider>[0]);
  const config = await getConfig();
  const modelMap: Record<string, string> = {
    opencode: config.opencodeTextModel,
    google: config.googleTextModel,
    openai: config.openaiTextModel,
    mimo: config.mimoTextModel,
    anthropic: config.anthropicTextModel,
  };
  const model = modelMap[providerType] || providerType;

  if (provider.generateTextStream) {
    let text = '';
    const gen = provider.generateTextStream(prompt, { thinking: true });
    let result = await gen.next();
    while (!result.done) {
      if (result.value.type === 'content') text += result.value.delta;
      result = await gen.next();
    }
    return {
      text: result.value.text || text,
      model,
      usage: result.value.usage,
    };
  }
  const result = await provider.generateText(prompt, { thinking: true });
  return {
    text: result.text,
    model,
    usage: result.usage,
  };
}

export async function handleGenerateScript(
  { db, actor, gameId, game }: McpGameContext,
  args: Record<string, unknown>,
): Promise<McpToolOutcome> {
  const story = String(args.story || '').trim();
  if (!story) return fail('缺少 story');
  const usageCheck = await checkUserUsageLimit(actor.user.id);
  if (!usageCheck.allowed) return fail(usageCheck.message || '今日 AI 额度已用尽');
  const permissions = await getUserAiPermissions(actor.user);
  const providerType = resolveTextProvider(permissions, typeof args.provider === 'string' ? args.provider : undefined);
  const contentRec = await db.select().from(schema.gameContent).where(eq(schema.gameContent.gameId, gameId)).get();
  const existing = contentRec?.content || '';
  const existingParsed = parse(existing);
  const useExisting =
    args.useExisting === true ||
    (args.useExisting !== false && existingParsed.success && hasSubstantialScript(existingParsed.data));

  let dslSpec: string;
  try {
    dslSpec = trimDslSpecForFirstPass(await fetchDslSpec());
  } catch {
    dslSpec = '';
  }
  const prompt =
    useExisting && existing
      ? buildReviseScriptPrompt(dslSpec, existing, story)
      : buildGenerateScriptPrompt(dslSpec, story);
  const first = await runTextGeneration(prompt, providerType);
  let script = stripCodeFence(first.text);
  const totalUsage = { ...first.usage };
  let model = first.model;

  const validation = validateGeneratedScript(script);
  if (!validation.ok) {
    const corrected = await runTextGeneration(buildCorrectionPrompt(script, validation), providerType);
    totalUsage.promptTokens += corrected.usage.promptTokens;
    totalUsage.completionTokens += corrected.usage.completionTokens;
    totalUsage.totalTokens += corrected.usage.totalTokens;
    model = corrected.model;
    const reval = validateGeneratedScript(stripCodeFence(corrected.text));
    if (!reval.parseError) script = stripCodeFence(corrected.text);
  }

  await recordAiUsage({
    userId: actor.user.id,
    type: 'text_generation',
    model,
    usage: totalUsage,
    gameId,
  });

  if (args.dryRun === true) {
    return ok('已生成剧本（dryRun 未写库）', { script, model, usage: totalUsage });
  }
  const writeResult = await writeGameContent(db, game, script);
  return { ...writeResult, data: { ...(writeResult.data || {}), script, model, usage: totalUsage } };
}

export async function handleGenerateImage(
  { actor, gameId }: McpGameContext,
  args: Record<string, unknown>,
): Promise<McpToolOutcome> {
  const prompt = String(args.prompt || '').trim();
  if (!prompt) return fail('缺少 prompt');
  const usageCheck = await checkUserUsageLimit(actor.user.id);
  if (!usageCheck.allowed) return fail(usageCheck.message || '今日 AI 额度已用尽');
  const permissions = await getUserAiPermissions(actor.user);
  if (!permissions.canGenerateImage) {
    return fail('当前用户没有图片生成权限');
  }
  const fileName = `images/${gameId}/${Date.now()}.png`;
  const { url, usage, model } = await generateAndUploadImage(prompt, fileName, {
    aspectRatio: typeof args.aspectRatio === 'string' ? args.aspectRatio : undefined,
  });
  await recordAiUsage({
    userId: actor.user.id,
    type: 'image_generation',
    model,
    usage,
    gameId,
  });
  return ok('图片已生成', { url, model, usage });
}
