'use client';

import { ConfigTextField } from '@/components/admin/ConfigTextField';
import type { AdminConfigDraft } from '@/lib/admin-config-draft';

/** 提供者下拉可绑定的草稿字段 */
type ProviderSelectField =
  | 'defaultTextProvider'
  | 'defaultTtsProvider'
  | 'defaultImageProvider'
  | 'defaultVideoProvider'
  | 'defaultMusicProvider'
  | 'defaultSfxProvider'
  | 'defaultSttProvider';

/** 文本输入可绑定的草稿字段（值为 string 的字段，不含 dailyTokenLimit 数字输入） */
type ConfigTextFieldField = {
  [K in keyof AdminConfigDraft]: AdminConfigDraft[K] extends string ? K : never;
}[keyof AdminConfigDraft];

interface ProviderOption {
  value: string;
  label: string;
}

interface ProviderSelectConfig {
  field: ProviderSelectField;
  label: string;
  hint?: string;
  options: ProviderOption[];
}

interface FieldConfig {
  field: ConfigTextFieldField;
  label: string;
  placeholder?: string;
  hint?: string;
  /** 仅当某个提供者下拉选中指定值时显示（如 STT 各家模型） */
  showIf?: { field: ProviderSelectField; equals: string };
}

interface ProviderSectionConfig {
  icon: string;
  title: string;
  selects: ProviderSelectConfig[];
  /** 有该标题时字段渲染在带分隔线的分组里；无则直接平铺 */
  fieldsTitle?: string;
  fields: FieldConfig[];
}

export type { ProviderSectionConfig };

/** 按生成类型分组的系统配置元数据：页面 JSX 由它驱动，新增模态只改这张表 */
export const PROVIDER_SECTIONS: ProviderSectionConfig[] = [
  {
    icon: '📝',
    title: '文本生成 (Text / LLM)',
    selects: [
      {
        field: 'defaultTextProvider',
        label: '默认文本提供者',
        hint: '剧本生成、对话助手（Chat）、故事评估等文本任务的默认引擎。',
        options: [
          { value: 'opencode', label: 'OpenCode Go（DeepSeek 默认）' },
          { value: 'mimo', label: '小米 MiMo' },
          { value: 'google', label: 'Google GenAI' },
          { value: 'openai', label: 'OpenAI' },
          { value: 'anthropic', label: 'Anthropic Claude' },
        ],
      },
    ],
    fieldsTitle: '各提供商文本模型',
    fields: [
      {
        field: 'opencodeTextModel',
        label: 'OpenCode 文本模型',
        placeholder: 'deepseek-v4.1-flash',
        hint: 'OpenCode Go 默认模型',
      },
      {
        field: 'opencodeBaseUrl',
        label: 'OpenCode base URL',
        placeholder: 'https://opencode.ai/zen/go/v1',
        hint: 'OpenCode 官方端点',
      },
      { field: 'mimoTextModel', label: '小米 MiMo 文本模型', placeholder: 'mimo-v2.5-pro' },
      {
        field: 'mimoBaseUrl',
        label: '小米 MiMo base URL',
        placeholder: 'https://token-plan-cn.xiaomimimo.com/v1',
        hint: 'Token Plan 订阅端点；按量付费可改为 https://api.xiaomimimo.com/v1',
      },
      {
        field: 'anthropicTextModel',
        label: 'Anthropic Claude 文本模型',
        placeholder: 'claude-sonnet-5',
        hint: '仅授权用户可用',
      },
      { field: 'googleTextModel', label: 'Google GenAI 文本模型', placeholder: 'gemini-3.8-flash' },
      { field: 'openaiTextModel', label: 'OpenAI 文本模型', placeholder: 'gpt-5.6-luna' },
    ],
  },
  {
    icon: '🎙️',
    title: '语音合成 (TTS / Voice)',
    selects: [
      {
        field: 'defaultTtsProvider',
        label: '默认 TTS 语音合成提供者',
        hint: '角色对白、旁白与音色试听合成提供者。',
        options: [
          { value: 'mimo', label: '小米 MiMo（推荐）' },
          { value: 'google', label: 'Google GenAI' },
          { value: 'openai', label: 'OpenAI' },
        ],
      },
    ],
    fieldsTitle: '各提供商 TTS 模型',
    fields: [
      {
        field: 'mimoTtsModel',
        label: '小米 MiMo TTS 模型',
        placeholder: 'mimo-v2.5-tts',
        hint: '预置丰富音色；在默认 TTS 选 MiMo 时生效',
      },
      { field: 'googleTtsModel', label: 'Google GenAI TTS 模型', placeholder: 'gemini-3.1-flash-tts-preview' },
      { field: 'openaiTtsModel', label: 'OpenAI TTS 模型', placeholder: 'gpt-4o-mini-tts' },
    ],
  },
  {
    icon: '🖼️',
    title: '图像生成 (Image)',
    selects: [
      {
        field: 'defaultImageProvider',
        label: '默认图片生成提供者',
        hint: '角色立绘、场景插画与背景生图引擎。',
        options: [
          { value: 'google', label: 'Google GenAI（推荐）' },
          { value: 'openai', label: 'OpenAI' },
        ],
      },
    ],
    fieldsTitle: '各提供商图像模型',
    fields: [
      { field: 'googleImageModel', label: 'Google GenAI 图片模型', placeholder: 'gemini-3.1-flash-lite-image' },
      { field: 'openaiImageModel', label: 'OpenAI 图片模型', placeholder: 'gpt-image-2.5-sunburst' },
    ],
  },
  {
    icon: '🎬',
    title: '视频生成 (Video)',
    selects: [
      {
        field: 'defaultVideoProvider',
        label: '默认视频生成提供者',
        hint: '场景视频与动画生成（未来支持接入 Kie / Fal 等）。',
        options: [{ value: 'google', label: 'Google GenAI (Veo)' }],
      },
    ],
    fieldsTitle: '视频模型配置',
    fields: [
      { field: 'googleVideoModel', label: 'Google GenAI 视频模型', placeholder: 'veo-3.1-fast-generate-preview' },
      {
        field: 'openaiVideoModel',
        label: 'OpenAI 视频模型',
        placeholder: '（暂不可用）',
        hint: 'Sora 2 已下线，未来将扩展支持 Kie / Fal 等',
      },
    ],
  },
  {
    icon: '🎵',
    title: '音乐与音效 (Music / SFX)',
    selects: [
      {
        field: 'defaultMusicProvider',
        label: '默认背景音乐 (BGM) 提供者',
        hint: '互动小说与游戏章节背景音乐 (BGM) 生成引擎。',
        options: [
          { value: 'internal', label: '内置精选素材库（默认）' },
          { value: 'suno', label: 'Suno AI（即将接入）' },
          { value: 'udio', label: 'Udio（即将接入）' },
          { value: 'elevenlabs', label: 'ElevenLabs（即将接入）' },
        ],
      },
      {
        field: 'defaultSfxProvider',
        label: '默认音效 (SFX) 提供者',
        hint: '按键音、交互反馈及场景环境音效 (SFX) 生成引擎。',
        options: [
          { value: 'internal', label: '内置音效库（默认）' },
          { value: 'elevenlabs', label: 'ElevenLabs Sound Effects（即将接入）' },
          { value: 'stable-audio', label: 'Stable Audio（即将接入）' },
        ],
      },
    ],
    fieldsTitle: '音乐与音效模型配置',
    fields: [
      { field: 'musicModel', label: '音乐生成模型', placeholder: 'suno-v4', hint: 'AI 音乐生成服务调用模型' },
      { field: 'sfxModel', label: '音效生成模型', placeholder: 'eleven-sfx-v1', hint: 'AI 短音效/环境音生成模型' },
    ],
  },
  {
    icon: '👂',
    title: '语音识别 (STT)',
    selects: [
      {
        field: 'defaultSttProvider',
        label: '默认 STT 语音识别提供者',
        hint: '语音输入与录音转写引擎。',
        options: [
          { value: 'openai', label: 'OpenAI' },
          { value: 'google', label: 'Google GenAI' },
          { value: 'mimo', label: 'MiMo ASR' },
        ],
      },
    ],
    fields: [
      {
        field: 'openaiSttModel',
        label: 'OpenAI 语音识别模型',
        placeholder: 'whisper-1',
        hint: 'OpenAI 转写模型 ID',
        showIf: { field: 'defaultSttProvider', equals: 'openai' },
      },
      {
        field: 'googleSttModel',
        label: 'Google 语音识别模型',
        placeholder: 'gemini-3-flash-transcribe',
        hint: 'Google GenAI 转写模型 ID',
        showIf: { field: 'defaultSttProvider', equals: 'google' },
      },
      {
        field: 'mimoSttModel',
        label: 'MiMo 语音识别模型',
        placeholder: 'mimo-v2.5-asr',
        hint: '小米 MiMo ASR 模型 ID，与 MiMo 文本/TTS 共用 MIMO_API_KEY 与 base URL',
        showIf: { field: 'defaultSttProvider', equals: 'mimo' },
      },
    ],
  },
  {
    icon: '🌐',
    title: '网关与网络连接 (AI Gateway)',
    selects: [],
    fields: [
      {
        field: 'cfAiGatewayBaseUrl',
        label: 'Cloudflare AI Gateway 地址',
        placeholder: 'https://gateway.ai.cloudflare.com/v1/{account}/{gateway}',
        hint: 'Claude/Gemini/OpenAI 的密钥存储在网关（BYOK），经它转发调用；OpenCode 与 MiMo 直连官方。',
      },
    ],
  },
];

/** 单个配置分组：由元数据渲染提供者下拉 + 模型字段 */
export function ProviderSection({
  section,
  formData,
  updateField,
}: {
  section: ProviderSectionConfig;
  formData: AdminConfigDraft;
  updateField: <K extends keyof AdminConfigDraft>(field: K, value: AdminConfigDraft[K]) => void;
}) {
  function renderFields(fields: FieldConfig[]) {
    return fields.map((field) => {
      if (field.showIf && formData[field.showIf.field] !== field.showIf.equals) return null;
      return (
        <ConfigTextField
          key={field.field}
          label={field.label}
          value={formData[field.field]}
          onChange={(value) => updateField(field.field, value)}
          placeholder={field.placeholder}
          hint={field.hint}
        />
      );
    });
  }

  return (
    <section className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-lg font-semibold mb-4 border-b pb-2 flex items-center gap-2">
        <span>{section.icon}</span>
        <span>{section.title}</span>
      </h2>

      <div className="space-y-4">
        {section.selects.map((select) => (
          <div key={select.field}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{select.label}</label>
            <select
              value={formData[select.field]}
              onChange={(e) => updateField(select.field, e.target.value as AdminConfigDraft[typeof select.field])}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2">
              {select.options.map((option) => (
                <option
                  key={option.value}
                  value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {select.hint && <p className="text-xs text-gray-500 mt-1">{select.hint}</p>}
          </div>
        ))}

        {section.fieldsTitle ? (
          <div className="pt-2 border-t space-y-4">
            <h3 className="text-sm font-semibold text-gray-600">{section.fieldsTitle}</h3>
            {renderFields(section.fields)}
          </div>
        ) : (
          renderFields(section.fields)
        )}
      </div>
    </section>
  );
}
