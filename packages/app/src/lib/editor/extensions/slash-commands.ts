import { Extension, type Editor } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import Suggestion, { exitSuggestion, type SuggestionOptions } from '@tiptap/suggestion';
import { DSL_TOOL_LABELS, type DslToolKind } from '../dsl-tools/types';
import { requestDslTool } from './dsl-tools';

export interface SlashCommandItem {
  title: string;
  description: string;
  icon: string;
  kind?: DslToolKind;
  command?: () => void;
}
const TOOLS: Array<[DslToolKind, string, string]> = [
  ['scene', '📖', '新建场景，开始一段剧情'],
  ['choice', '🔀', '设置选项文字和目标场景'],
  ['redirect', '→', '继续阅读或按条件分流'],
  ['dialogue', '💬', '选择角色，填写台词'],
  ['variable', '{}', '插入变量的当前值'],
  ['conditional', '分支', '按条件显示不同文字'],
  ['image', '🖼️', '添加或编辑场景图片'],
  ['audio', '🎵', '添加或编辑背景音乐、音效'],
  ['video', '🎬', '添加或编辑场景视频'],
  ['minigame', '🎮', '添加或编辑互动小游戏'],
];
export const slashCommandItems: SlashCommandItem[] = TOOLS.map(([kind, icon, description]) => ({
  kind,
  title: DSL_TOOL_LABELS[kind],
  description,
  icon,
}));
export const slashCommandPluginKey = new PluginKey('slashCommand');

export const SlashCommands = Extension.create({
  name: 'slashCommands',
  addOptions() {
    return {
      suggestion: {
        char: '/',
        pluginKey: slashCommandPluginKey,
        command: ({
          editor,
          range,
          props,
        }: {
          editor: Editor;
          range: { from: number; to: number };
          props: SlashCommandItem;
        }) => {
          // 提交表单时才删除触发文字，取消不会改动文档。
          exitSuggestion(editor.view, slashCommandPluginKey);
          if (props.kind) requestDslTool(editor, { kind: props.kind, position: range.from, slashRange: range });
        },
        items: ({ query }: { query: string }) =>
          slashCommandItems.filter(
            (item) =>
              item.title.toLowerCase().includes(query.toLowerCase()) ||
              item.description.toLowerCase().includes(query.toLowerCase()),
          ),
      } as Partial<SuggestionOptions>,
    };
  },
  addProseMirrorPlugins() {
    return [Suggestion({ editor: this.editor, ...this.options.suggestion })];
  },
});
