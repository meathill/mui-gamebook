/**
 * 斜杠命令扩展
 *
 * 输入 / 弹出命令菜单，可插入场景、选项、素材块等 DSL 元素。
 */
import { Extension } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import Suggestion, { type SuggestionOptions } from '@tiptap/suggestion';

export interface SlashCommandItem {
  title: string;
  description: string;
  icon: string;
  command: (props: { editor: () => any }) => void;
}

export const slashCommandItems: SlashCommandItem[] = [
  {
    title: '新场景',
    description: '插入一个新的场景标题',
    icon: '📖',
    command: ({ editor }) => {
      const id = `scene_${Date.now().toString().slice(-4)}`;
      editor().focus().setHorizontalRule().run();
      editor()
        .focus()
        .insertContent({ type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: id }] })
        .run();
    },
  },
  {
    title: '选项',
    description: '插入一个分支选项 [文本] -> 目标场景',
    icon: '🔀',
    command: ({ editor }) => {
      editor().focus().insertContent('* [选项文本] -> target_scene').run();
    },
  },
  {
    title: '图片素材',
    description: '插入 AI 图片生成块',
    icon: '🖼️',
    command: ({ editor }) => {
      editor()
        .focus()
        .insertContent({
          type: 'codeBlock',
          attrs: { language: 'yaml' },
          content: [{ type: 'text', text: 'image:\n  prompt: "描述图片内容"\n  url: ' }],
        })
        .run();
    },
  },
  {
    title: '音频素材',
    description: '插入背景音乐或音效块',
    icon: '🎵',
    command: ({ editor }) => {
      editor()
        .focus()
        .insertContent({
          type: 'codeBlock',
          attrs: { language: 'yaml' },
          content: [{ type: 'text', text: 'audio:\n  type: background_music\n  prompt: "描述音乐风格"\n  url: ' }],
        })
        .run();
    },
  },
  {
    title: '视频素材',
    description: '插入 AI 视频生成块',
    icon: '🎬',
    command: ({ editor }) => {
      editor()
        .focus()
        .insertContent({
          type: 'codeBlock',
          attrs: { language: 'yaml' },
          content: [{ type: 'text', text: 'video:\n  prompt: "描述视频内容"\n  url: ' }],
        })
        .run();
    },
  },
  {
    title: '小游戏',
    description: '插入互动小游戏块',
    icon: '🎮',
    command: ({ editor }) => {
      editor()
        .focus()
        .insertContent({
          type: 'codeBlock',
          attrs: { language: 'yaml' },
          content: [{ type: 'text', text: 'minigame:\n  prompt: "描述游戏规则"\n  variables:\n    score: "分数"' }],
        })
        .run();
    },
  },
  {
    title: '变量',
    description: '插入变量引用 {{变量名}}',
    icon: '📊',
    command: ({ editor }) => {
      editor().focus().insertContent('{{variable_name}}').run();
    },
  },
  {
    title: '条件文本',
    description: '根据变量值显示不同内容',
    icon: '🔀',
    command: ({ editor }) => {
      editor()
        .focus()
        .insertContent('{{ if variable == true }}\n条件为真时显示的文本\n{{ else }}\n条件为假时显示的文本\n{{ /if }}')
        .run();
    },
  },
  {
    title: '分隔线',
    description: '插入场景分隔线 ---',
    icon: '➖',
    command: ({ editor }) => {
      editor().focus().setHorizontalRule().run();
    },
  },
];

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
          editor: any;
          range: { from: number; to: number };
          props: SlashCommandItem;
        }) => {
          // 先删除 / 触发字符
          editor.chain().focus().deleteRange(range).run();
          // 再执行命令
          props.command({ editor: () => editor.chain() });
        },
        items: ({ query }: { query: string }) => {
          return slashCommandItems.filter(
            (item) =>
              item.title.toLowerCase().includes(query.toLowerCase()) ||
              item.description.toLowerCase().includes(query.toLowerCase()),
          );
        },
      } as Partial<SuggestionOptions>,
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});
