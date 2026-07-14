/**
 * 有声书生成模块的类型定义
 */
import type { Game } from '@mui-gamebook/parser';

/** 旁白说话人 ID（保留字），narrator 的音色解析规则见 voice-assignment.ts */
export const NARRATOR_SPEAKER_ID = 'narrator';

/** LLM 分段返回的原始分段（尚未解析音色） */
export interface RawSegment {
  /** NARRATOR_SPEAKER_ID 或 game.ai.characters 的 key */
  speaker: string;
  /** 原文逐字摘录 */
  text: string;
}

/** 分段任务所需的上下文 */
export interface SegmentationContext {
  game: Game;
  sceneId: string;
  nodeIndex: number;
  /** 滚动上下文缓冲区（跨场景累积，仅供参考，不保证是通往当前节点的实际路径），可能为空字符串 */
  precedingExcerpt: string;
}

/** audiobook / audiobook-local 命令的公共选项 */
export interface AudiobookCommandOptions {
  force: boolean;
  dryRun: boolean;
  segmentsOnly: boolean;
  verbose: boolean;
}

/** generateAudiobook 的选项 */
export interface GenerateAudiobookOptions {
  gameSlug: string;
  force: boolean;
  dryRun: boolean;
  segmentsOnly: boolean;
  verbose: boolean;
}

/**
 * manifest 里一句话的 cue：记录这句话在所属章节音频里的精确起止时间，
 * 供前端做视觉/听觉同步（音频播放到这个时间点时高亮/推进对应的文字）
 */
export interface AudiobookCue {
  /** 对应 scene.nodes[nodeIndex]，跳过的节点（非 text/choice、含 {{...}} 等）不会出现在 cue 里 */
  nodeIndex: number;
  nodeType: 'text' | 'choice';
  /** choice 节点才有：这句读完后，玩家选这个选项会跳转到的场景 */
  nextSceneId?: string;
  speaker: string;
  voice: string;
  /** 这句话的原文 */
  text: string;
  startMs: number;
  endMs: number;
}

/**
 * manifest 中的一个"章节"——一个场景的完整拼接音频（=章节粒度按场景划分，
 * 因为剧情分支，"场景"是唯一天然、无需额外设计分组规则的朗读单元）
 */
export interface AudiobookChapter {
  sceneId: string;
  url: string;
  durationMs: number;
  mimeType: string;
  /** 按朗读顺序排列，全部拼接对应 url 指向的完整音频 */
  cues: AudiobookCue[];
}

/** 有声书 manifest，存储于 R2: audiobook/<gameSlug>/manifest.json */
export interface AudiobookManifest {
  schemaVersion: 2;
  gameSlug: string;
  title: string;
  generatedAt: string;
  provider: 'mimo';
  /** characterId（含 NARRATOR_SPEAKER_ID）→ 实际使用的音色 ID，生成时的快照 */
  voices: Record<string, string>;
  /** 按 sceneId 索引；没有可朗读内容（纯图片/动态文本等）的场景不会出现在这里 */
  chapters: Record<string, AudiobookChapter>;
}

/** generateAudiobook 运行过程的统计信息 */
export interface AudiobookStats {
  totalNodes: number;
  textNodes: number;
  choiceNodes: number;
  skippedDynamic: number;
  /** 含多角色对白的节点数（分段数 > 1，分段发生在按句切分之前） */
  segmentedNodes: number;
  /** 纯旁白节点数（分段数 == 1） */
  singleSegmentNodes: number;
  /** 按句切分后的 cue 总数（比分段数更细，是实际 TTS 调用的粒度） */
  totalSentences: number;
  /** 实际生成了章节音频的场景数 */
  chaptersWithAudio: number;
  /** 实际调用 TTS 的次数（缓存命中不计入） */
  ttsCalls: number;
}

/** generateAudiobook 的返回结果 */
export interface AudiobookGenerationResult {
  manifest: AudiobookManifest;
  /** dryRun 或 segmentsOnly 时不上传 manifest，为 undefined */
  manifestUrl?: string;
  stats: AudiobookStats;
}

/** --segments-only 预览输出用的单节点分段结果 */
export interface SegmentPreviewEntry {
  sceneId: string;
  nodeIndex: number;
  segments: RawSegment[];
}
