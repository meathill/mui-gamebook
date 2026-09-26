import { describe, expect, it } from 'vitest';
import {
  IMAGE_MODEL_PRESETS,
  isAiModelModality,
  isImageProviderType,
  isTextProviderType,
  isTtsProviderType,
  isVideoProviderType,
  MODALITY_PROVIDERS,
  TEXT_MODEL_PRESETS,
  TTS_MODEL_PRESETS,
  validatePreferredTextModel,
  VIDEO_MODEL_PRESETS,
} from '@/lib/ai-model-catalog';

describe('ai-model-catalog', () => {
  it('五家供应商都有预设，第一项为系统默认', () => {
    for (const provider of ['openai', 'google', 'mimo', 'anthropic', 'opencode'] as const) {
      expect(TEXT_MODEL_PRESETS[provider].length).toBeGreaterThan(0);
    }
    expect(TEXT_MODEL_PRESETS.openai[0]?.value).toBe('gpt-5.6-luna');
    expect(TEXT_MODEL_PRESETS.google[0]?.value).toBe('gemini-3.8-flash');
    expect(TEXT_MODEL_PRESETS.mimo[0]?.value).toBe('mimo-v2.5-pro');
    expect(TEXT_MODEL_PRESETS.anthropic[0]?.value).toBe('claude-sonnet-5');
    expect(TEXT_MODEL_PRESETS.opencode[0]?.value).toBe('deepseek-v4.1-flash');
  });

  it('isTextProviderType 只接受五种供应商', () => {
    expect(isTextProviderType('openai')).toBe(true);
    expect(isTextProviderType('gpt-x')).toBe(false);
    expect(isTextProviderType(null)).toBe(false);
  });

  it('validatePreferredTextModel 拒绝空值/超长/非法字符', () => {
    expect(validatePreferredTextModel('gpt-5-mini')).toBe(true);
    expect(validatePreferredTextModel('deepseek-v4.1-flash')).toBe(true);
    expect(validatePreferredTextModel('')).toBe(false);
    expect(validatePreferredTextModel(null)).toBe(false);
    expect(validatePreferredTextModel('a'.repeat(129))).toBe(false);
    expect(validatePreferredTextModel('model; rm -rf')).toBe(false);
    expect(validatePreferredTextModel('model\ninjection')).toBe(false);
  });

  it('三模态能力名单与守卫一致', () => {
    expect(MODALITY_PROVIDERS.image).toEqual(['google', 'openai']);
    expect(MODALITY_PROVIDERS.tts).toEqual(['mimo', 'google', 'openai']);
    expect(MODALITY_PROVIDERS.video).toEqual(['google', 'openai']);
    expect(isImageProviderType('google')).toBe(true);
    expect(isImageProviderType('mimo')).toBe(false);
    expect(isTtsProviderType('mimo')).toBe(true);
    expect(isTtsProviderType('anthropic')).toBe(false);
    expect(isVideoProviderType('openai')).toBe(true);
    expect(isVideoProviderType('opencode')).toBe(false);
    expect(isAiModelModality('tts')).toBe(true);
    expect(isAiModelModality('music')).toBe(false);
  });

  it('图片/语音预设第一项为系统默认；OpenAI 视频暂无预设', () => {
    expect(IMAGE_MODEL_PRESETS.google[0]?.value).toBe('gemini-3.1-flash-lite-image');
    expect(IMAGE_MODEL_PRESETS.openai[0]?.value).toBe('gpt-image-2.5-sunburst');
    expect(TTS_MODEL_PRESETS.mimo[0]?.value).toBe('mimo-v2.5-tts');
    expect(TTS_MODEL_PRESETS.google[0]?.value).toBe('gemini-3.1-flash-tts-preview');
    expect(TTS_MODEL_PRESETS.openai[0]?.value).toBe('gpt-4o-mini-tts');
    expect(VIDEO_MODEL_PRESETS.google[0]?.value).toBe('veo-3.1-fast-generate-preview');
    expect(VIDEO_MODEL_PRESETS.openai).toEqual([]);
  });
});
