/**
 * 有声书 manifest 生成与编排
 *
 * 章节 = 场景（scene）：剧情是分支图，"场景"是唯一天然、不需要额外设计分组
 * 规则的朗读单元（也正好对应现有阅读界面"一屏一场景"的渲染方式）。
 *
 * 每个场景内，按节点顺序（text/choice）依次：
 * 1. 说话人分段（segmentText，LLM，dryRun/segmentsOnly 之外都会跑）
 * 2. 按句切分（explodeSegmentsToSentences，纯规则，供逐句 cue）
 * 3. 逐句生成 TTS（沿用旧版两级缓存中的"本地磁盘内容哈希缓存"这一级）
 * 4. 拼接成一个章节 WAV（audio-concat.ts）→ 转 MP3（converter.ts 的 wavToMp3）
 * 5. 上传（章节 mp3 和 manifest.json 一样，每次运行都无条件重新上传，只有
 *    逐句 TTS 这一步是真正缓存的——拼接/转码是本地 CPU 工作，不是付费/限流
 *    资源，没必要为了省一次重新上传而单独维护"整章是否变化"的缓存）
 *
 * 只读：不修改 game.scenes，不写回 DSL——分段/音色/音频是独立于故事内容的
 * 旁路产物，详见 CLAUDE.md 的架构说明（可视化编辑器会把一个场景的所有文本
 * 节点合并成一个节点保存，往节点结构里塞这些数据会被合并逻辑悄悄冲掉）。
 */
import type { Game, Scene } from '@mui-gamebook/parser';
import { generateStorySpeech, type VoiceName } from '../tts';
import { generateCacheFileName, cacheExists, readCache, writeCache } from '../cache';
import { uploadToR2 } from '../uploader';
import { wavToMp3 } from '../converter';
import { explodeSegmentsToSentences } from '@mui-gamebook/core/lib/audiobook/sentence-split';
import { segmentText } from './segmentation';
import { resolveVoiceForSpeaker } from './voice-assignment';
import { concatenateWavFiles, getWavDurationMs } from './audio-concat';
import { printVoiceTable, printSegmentsPreview } from './report';
import {
  NARRATOR_SPEAKER_ID,
  type AudiobookChapter,
  type AudiobookCue,
  type AudiobookGenerationResult,
  type AudiobookManifest,
  type AudiobookStats,
  type GenerateAudiobookOptions,
  type SegmentPreviewEntry,
} from './types';

/** 滚动上下文缓冲区上限（字符数），帮助分段模型判断冒充/伪装身份的说话人 */
const MAX_CONTEXT_CHARS = 800;

/** 含 {{...}} 的动态插值/条件文本，v1 无法预生成语音，直接跳过并记录 */
function hasDynamicContent(text: string): boolean {
  return text.includes('{{');
}

function appendToRollingBuffer(buffer: string, addition: string): string {
  if (!addition) return buffer;
  const combined = buffer ? `${buffer}\n${addition}` : addition;
  return combined.length > MAX_CONTEXT_CHARS ? combined.slice(combined.length - MAX_CONTEXT_CHARS) : combined;
}

function createEmptyStats(): AudiobookStats {
  return {
    totalNodes: 0,
    textNodes: 0,
    choiceNodes: 0,
    skippedDynamic: 0,
    segmentedNodes: 0,
    singleSegmentNodes: 0,
    totalSentences: 0,
    chaptersWithAudio: 0,
    ttsCalls: 0,
  };
}

function createEmptyManifest(game: Game, gameSlug: string): AudiobookManifest {
  return {
    schemaVersion: 2,
    gameSlug,
    title: game.title,
    generatedAt: new Date().toISOString(),
    provider: 'mimo',
    voices: {},
    chapters: {},
  };
}

/** 一个节点里、按句切分后的一句话——仍带着 speaker，尚未生成音频/计算 cue 时间 */
interface PlannedSentence {
  nodeIndex: number;
  nodeType: 'text' | 'choice';
  /** 同一节点内的第几句（从 0 开始），仅用于音频缓存文件名的可读性/唯一性 */
  sentenceIndexInNode: number;
  nextSceneId?: string;
  speaker: string;
  text: string;
}

/**
 * 阶段 A：遍历一个场景，为每个 text/choice 节点分段、按句切分、登记音色
 * 返回按朗读顺序排列的句子列表，以及供人工预览的分段结果
 */
async function planScene(
  game: Game,
  scene: Scene,
  precedingExcerpt: string,
  stats: AudiobookStats,
  voices: Record<string, string>,
): Promise<{ sentences: PlannedSentence[]; previewEntries: SegmentPreviewEntry[]; updatedContext: string }> {
  const sentences: PlannedSentence[] = [];
  const previewEntries: SegmentPreviewEntry[] = [];
  let rollingContext = precedingExcerpt;

  const recordVoice = (speaker: string) => {
    if (!(speaker in voices)) {
      voices[speaker] = resolveVoiceForSpeaker(speaker, game);
    }
  };

  for (let nodeIndex = 0; nodeIndex < scene.nodes.length; nodeIndex++) {
    const node = scene.nodes[nodeIndex];
    stats.totalNodes++;

    if (node.type === 'text') {
      stats.textNodes++;
      if (hasDynamicContent(node.content)) {
        stats.skippedDynamic++;
        continue;
      }

      const segments = await segmentText(node.content, {
        game,
        sceneId: scene.id,
        nodeIndex,
        precedingExcerpt: rollingContext,
      });
      rollingContext = appendToRollingBuffer(rollingContext, node.content);

      segments.forEach((segment) => recordVoice(segment.speaker));
      stats[segments.length > 1 ? 'segmentedNodes' : 'singleSegmentNodes']++;
      previewEntries.push({ sceneId: scene.id, nodeIndex, segments });

      explodeSegmentsToSentences(segments).forEach((sentence, sentenceIndexInNode) => {
        stats.totalSentences++;
        sentences.push({
          nodeIndex,
          nodeType: 'text',
          sentenceIndexInNode,
          speaker: sentence.speaker,
          text: sentence.text,
        });
      });
      continue;
    }

    if (node.type === 'choice') {
      stats.choiceNodes++;
      if (hasDynamicContent(node.text)) {
        stats.skippedDynamic++;
        continue;
      }

      recordVoice(NARRATOR_SPEAKER_ID);
      stats.singleSegmentNodes++;

      explodeSegmentsToSentences([{ speaker: NARRATOR_SPEAKER_ID, text: node.text }]).forEach(
        (sentence, sentenceIndexInNode) => {
          stats.totalSentences++;
          sentences.push({
            nodeIndex,
            nodeType: 'choice',
            sentenceIndexInNode,
            nextSceneId: node.nextSceneId,
            speaker: sentence.speaker,
            text: sentence.text,
          });
        },
      );
    }
  }

  return { sentences, previewEntries, updatedContext: rollingContext };
}

/**
 * 阶段 B：把一个场景规划好的句子逐句生成 TTS（带缓存）、拼接成一个章节音频，
 * 计算每句在最终音频里的精确起止时间。没有任何句子（比如整场都是图片/动态
 * 文本）时返回 null，该场景不会出现在 manifest 里。
 */
async function synthesizeChapter(
  sceneId: string,
  sentences: PlannedSentence[],
  voices: Record<string, string>,
  gameSlug: string,
  force: boolean,
  stats: AudiobookStats,
): Promise<AudiobookChapter | null> {
  if (sentences.length === 0) {
    return null;
  }

  const buffers: Buffer[] = [];
  const cueDrafts: Array<Omit<AudiobookCue, 'startMs' | 'endMs'>> = [];

  for (const sentence of sentences) {
    const voice = voices[sentence.speaker];
    const nodeTypeTag = `${sentence.nodeType}-${sentence.sentenceIndexInNode}`;
    const cacheFileName = generateCacheFileName(sceneId, sentence.nodeIndex, nodeTypeTag, sentence.text, 'wav', voice);

    let buffer: Buffer;
    if (!force && cacheExists(gameSlug, cacheFileName)) {
      buffer = readCache(gameSlug, cacheFileName)!;
    } else {
      const result = await generateStorySpeech(sentence.text, voice as VoiceName);
      buffer = result.buffer;
      writeCache(gameSlug, cacheFileName, buffer);
      stats.ttsCalls++;
    }

    buffers.push(buffer);
    cueDrafts.push({
      nodeIndex: sentence.nodeIndex,
      nodeType: sentence.nodeType,
      nextSceneId: sentence.nextSceneId,
      speaker: sentence.speaker,
      voice,
      text: sentence.text,
    });
  }

  const durations = buffers.map((buffer) => getWavDurationMs(buffer));
  const cues: AudiobookCue[] = [];
  let cursorMs = 0;
  for (let i = 0; i < cueDrafts.length; i++) {
    const startMs = cursorMs;
    const endMs = startMs + durations[i];
    cues.push({ ...cueDrafts[i], startMs, endMs });
    cursorMs = endMs;
  }

  const concatenated = concatenateWavFiles(buffers);
  const mp3Buffer = wavToMp3(concatenated);
  const url = await uploadToR2(`audiobook/${gameSlug}/chapters/${sceneId}.mp3`, mp3Buffer, 'audio/mpeg');

  return { sceneId, url, durationMs: cursorMs, mimeType: 'audio/mpeg', cues };
}

/**
 * 生成整本书的有声书 manifest
 */
export async function generateAudiobook(
  game: Game,
  options: GenerateAudiobookOptions,
): Promise<AudiobookGenerationResult> {
  const stats = createEmptyStats();

  if (options.dryRun) {
    for (const scene of Object.values(game.scenes)) {
      for (const node of scene.nodes) {
        stats.totalNodes++;
        if (node.type === 'text') {
          stats.textNodes++;
          if (hasDynamicContent(node.content)) stats.skippedDynamic++;
        } else if (node.type === 'choice') {
          stats.choiceNodes++;
          if (hasDynamicContent(node.text)) stats.skippedDynamic++;
        }
      }
    }
    return { manifest: createEmptyManifest(game, options.gameSlug), stats };
  }

  const voices: Record<string, string> = {};
  const allPreviewEntries: SegmentPreviewEntry[] = [];
  const scenePlans: Array<{ sceneId: string; sentences: PlannedSentence[] }> = [];
  let rollingContext = '';

  for (const scene of Object.values(game.scenes)) {
    const planned = await planScene(game, scene, rollingContext, stats, voices);
    rollingContext = planned.updatedContext;
    allPreviewEntries.push(...planned.previewEntries);
    scenePlans.push({ sceneId: scene.id, sentences: planned.sentences });
  }

  printVoiceTable(voices);
  printSegmentsPreview(allPreviewEntries, options.verbose);

  if (options.segmentsOnly) {
    const manifest = createEmptyManifest(game, options.gameSlug);
    manifest.voices = voices;
    return { manifest, stats };
  }

  const chapters: Record<string, AudiobookChapter> = {};
  for (const plan of scenePlans) {
    const chapter = await synthesizeChapter(
      plan.sceneId,
      plan.sentences,
      voices,
      options.gameSlug,
      options.force,
      stats,
    );
    if (chapter) {
      chapters[plan.sceneId] = chapter;
      stats.chaptersWithAudio++;
    }
  }

  const manifest: AudiobookManifest = {
    schemaVersion: 2,
    gameSlug: options.gameSlug,
    title: game.title,
    generatedAt: new Date().toISOString(),
    provider: 'mimo',
    voices,
    chapters,
  };

  const manifestUrl = await uploadToR2(
    `audiobook/${options.gameSlug}/manifest.json`,
    Buffer.from(JSON.stringify(manifest, null, 2), 'utf-8'),
    'application/json',
  );

  return { manifest, manifestUrl, stats };
}
