/**
 * 对话节点（DSL v2 `@角色ID: 台词`）的展示辅助。
 * speaker 存的是角色 ID，展示名从 PlayableGame.characters 解析；
 * 未注册（理论上 parser 已拦截）回退显示原始 ID。
 */
import type { PlayableCharacter } from '@mui-gamebook/parser/src/types';

export function resolveSpeakerName(speaker: string, characters?: Record<string, PlayableCharacter>): string {
  return characters?.[speaker]?.name ?? speaker;
}

/** 对话的单行文本形态（沉浸模式/打字机流）：`名字：台词` */
export function formatDialogueLine(name: string, content: string): string {
  return `${name}：${content}`;
}
