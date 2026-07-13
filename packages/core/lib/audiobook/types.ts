/**
 * 有声书生成的共享类型定义
 * 不依赖 @mui-gamebook/parser 的 Game 类型——用一个结构上兼容的通用角色名单类型，
 * 这样 Node CLI（packages/asset-generator）和 Workers 应用（packages/app）都能直接
 * 传 game.ai.characters 进来，不需要 core 反过来依赖 parser
 */

/** 旁白说话人 ID（保留字），narrator 的音色解析规则见 voice-assignment.ts */
export const NARRATOR_SPEAKER_ID = 'narrator';

/** 分段/音色解析所需的最小角色信息 */
export interface CharacterInfo {
  name: string;
  description?: string;
  image_prompt?: string;
  voice_name?: string;
}

/** 角色名单：角色 ID → 角色信息，通常就是 game.ai.characters */
export type CharacterRoster = Record<string, CharacterInfo>;

/** LLM 分段返回的原始分段（尚未解析音色） */
export interface RawSegment {
  /** NARRATOR_SPEAKER_ID 或角色名单里的 key */
  speaker: string;
  /** 原文逐字摘录 */
  text: string;
}

/** 分段任务所需的上下文 */
export interface SegmentationContext {
  roster: CharacterRoster;
  sceneId: string;
  nodeIndex: number;
  /** 滚动上下文缓冲区（跨场景累积，仅供参考，不保证是通往当前节点的实际路径），可能为空字符串 */
  precedingExcerpt: string;
}
