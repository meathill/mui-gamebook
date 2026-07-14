/**
 * 有声书生成过程的控制台输出
 */
import {
  NARRATOR_SPEAKER_ID,
  type AudiobookCommandOptions,
  type AudiobookGenerationResult,
  type SegmentPreviewEntry,
} from './types';

/**
 * 打印每个说话人最终解析出的音色
 * 在真正花钱生成音频之前就能看到，方便发现音色分配不合理（比如角色撞音色）
 */
export function printVoiceTable(voices: Record<string, string>): void {
  console.log('\n[Audiobook] 音色分配:');
  const entries = Object.entries(voices).sort(([a], [b]) => {
    if (a === NARRATOR_SPEAKER_ID) return -1;
    if (b === NARRATOR_SPEAKER_ID) return 1;
    return a.localeCompare(b);
  });
  for (const [speaker, voice] of entries) {
    console.log(`  ${speaker} → ${voice}`);
  }
}

/**
 * 打印分段预览
 * 多分段（含角色对白）节点全部打印；单一旁白节点默认只统计数量，--verbose 才展开——
 * 不然几百个场景的书会刷屏刷到没法看
 */
export function printSegmentsPreview(entries: SegmentPreviewEntry[], verbose: boolean): void {
  const multiSegment = entries.filter((entry) => entry.segments.length > 1);
  const singleSegment = entries.filter((entry) => entry.segments.length <= 1);

  console.log(`\n[Audiobook] 分段预览（共 ${entries.length} 个节点，${multiSegment.length} 个含角色对白）:`);

  for (const entry of multiSegment) {
    console.log(`\n  场景 ${entry.sceneId} 节点 #${entry.nodeIndex}:`);
    for (const segment of entry.segments) {
      const label = segment.speaker === NARRATOR_SPEAKER_ID ? '[narrator]' : `[${segment.speaker}]`;
      console.log(`    ${label} ${segment.text}`);
    }
  }

  if (verbose) {
    for (const entry of singleSegment) {
      const text = entry.segments[0]?.text ?? '';
      console.log(`\n  场景 ${entry.sceneId} 节点 #${entry.nodeIndex}: [narrator] ${text}`);
    }
  } else if (singleSegment.length > 0) {
    console.log(`\n  （另有 ${singleSegment.length} 个单一旁白节点，已折叠，加 --verbose 查看全部）`);
  }
}

/** audiobook / audiobook-local 命令启动时打印的模式说明 */
export function describeAudiobookMode(options: AudiobookCommandOptions): string {
  if (options.dryRun) return '预览统计（不调用 AI）';
  if (options.segmentsOnly) return '仅分段（跳过 TTS）';
  return '完整生成';
}

/** 打印 generateAudiobook 运行结束后的统计与 manifest 地址 */
export function printAudiobookSummary(result: AudiobookGenerationResult): void {
  const { stats, manifestUrl } = result;
  console.log(`\n${'='.repeat(50)}`);
  console.log('统计信息:');
  console.log(`  总节点数: ${stats.totalNodes}（文本 ${stats.textNodes} / 选项 ${stats.choiceNodes}）`);
  console.log(`  跳过的动态节点（含 {{...}}）: ${stats.skippedDynamic}`);
  console.log(`  含角色对白的节点: ${stats.segmentedNodes}`);
  console.log(`  按句切分后的 cue 总数: ${stats.totalSentences}`);
  console.log(`  实际 TTS 调用次数: ${stats.ttsCalls}`);
  console.log(`  生成的章节（场景）数: ${stats.chaptersWithAudio}`);
  if (manifestUrl) {
    console.log(`\n✅ Manifest 已上传: ${manifestUrl}`);
  } else {
    console.log('\n（未上传 manifest：dry-run 或 --segments-only 模式）');
  }
  console.log('='.repeat(50));
}
