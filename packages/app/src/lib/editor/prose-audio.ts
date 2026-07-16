/**
 * 编辑器 prose content 的语音注释操作（issue #9）。
 * content 以 DSL 原文形态内联 `<!-- audio: URL -->`（与 stringify 落盘形态一致），
 * 所有操作都走 parseProseBlock → 改节点 → 重序列化，与 parser 单一语义源对齐，
 * 不写第二套字符串手术正则（孤儿注释、legacy 同行形态、重定向行都由 parser 兜住）。
 */
import { parseProseBlock } from '@mui-gamebook/parser/src/parse-scene';
import { proseNodeToLine, redirectNodeToLine } from '@mui-gamebook/parser/src/serialize';
import type { SceneNode } from '@mui-gamebook/parser/src/types';

/** 独占一行的语音注释（宽松匹配，仅供预览行过滤） */
const AUDIO_COMMENT_LINE_REGEX = /^\s*<!--\s*audio:.*-->\s*$/;

/**
 * prose 节点序列 → 编辑器 content 文本（带内联语音注释）。
 * 只序列化 text/dialogue/redirect，其余类型忽略（与 gameToFlow 的 prose 流口径一致）。
 * 对话行不需要 characterIds：`@x: y` 按 text 或 dialogue 序列化结果逐字节相同。
 */
export function proseNodesToContent(nodes: SceneNode[]): string {
  const blocks: string[] = [];
  for (const node of nodes) {
    if (node.type === 'text' || node.type === 'dialogue') {
      blocks.push(proseNodeToLine(node));
      // 语音注释独占一段、紧跟正文之后（与 serialize.ts 落盘形态一致）
      if (node.audio_url) blocks.push(`<!-- audio: ${node.audio_url} -->`);
    } else if (node.type === 'redirect') {
      blocks.push(redirectNodeToLine(node));
    }
  }
  return blocks.join('\n\n');
}

/** 读取 content 中第一条语音注释的 URL（Inspector 音频预览） */
export function getPrimaryAudioUrl(content: string): string | undefined {
  for (const node of parseProseBlock(content)) {
    if ((node.type === 'text' || node.type === 'dialogue') && node.audio_url) {
      return node.audio_url;
    }
  }
  return undefined;
}

/** 去掉全部语音注释（TTS 输入不能朗读注释） */
export function stripAudioComments(content: string): string {
  const nodes = parseProseBlock(content).map((node) =>
    (node.type === 'text' || node.type === 'dialogue') && node.audio_url ? { ...node, audio_url: undefined } : node,
  );
  return proseNodesToContent(nodes);
}

/**
 * 整段 TTS 结果写回：清掉全部语音注释，把 url 挂到第一个 text/dialogue 节点
 * （维持「整场景一条语音」语义，避免整段朗读与残留的逐段语音叠播）。
 * 无可挂载节点（纯重定向/空场景）时原样返回。
 */
export function setPrimaryAudioUrl(content: string, url: string): string {
  const nodes = parseProseBlock(content);
  const target = nodes.find((node) => node.type === 'text' || node.type === 'dialogue');
  if (!target) return content;

  const next = nodes.map((node) => {
    if (node.type !== 'text' && node.type !== 'dialogue') return node;
    return { ...node, audio_url: node === target ? url : undefined };
  });
  return proseNodesToContent(next);
}

/** 便宜的行过滤版剥离（不走 parse），供画布卡片等高频渲染的纯预览场景 */
export function stripAudioCommentLines(content: string): string {
  return content
    .split('\n')
    .filter((line) => !AUDIO_COMMENT_LINE_REGEX.test(line))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
