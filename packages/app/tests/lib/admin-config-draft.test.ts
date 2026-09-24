import { describe, expect, it } from 'vitest';
import { createAdminConfigDraft, parseAdminConfigDraft } from '@/lib/admin-config-draft';
import type { AppConfig } from '@/lib/config';

const CONFIG: AppConfig = {
  dailyTokenLimit: 100000,
  defaultTextProvider: 'opencode',
  defaultAiProvider: 'opencode',
  defaultTtsProvider: 'mimo',
  defaultImageProvider: 'google',
  defaultVideoProvider: 'google',
  defaultSttProvider: 'mimo',
  defaultMusicProvider: 'internal',
  defaultSfxProvider: 'internal',
  musicModel: 'suno-v4',
  sfxModel: 'eleven-sfx-v1',
  opencodeTextModel: 'deepseek-v4.1-flash',
  opencodeBaseUrl: 'https://opencode.ai/zen/go/v1',
  googleTextModel: 'google-text',
  googleImageModel: 'google-image',
  googleTtsModel: 'google-tts',
  googleVideoModel: 'google-video',
  googleSttModel: 'google-stt',
  openaiTextModel: 'openai-text',
  openaiImageModel: 'openai-image',
  openaiTtsModel: 'openai-tts',
  openaiVideoModel: 'openai-video',
  openaiSttModel: 'openai-stt',
  mimoTextModel: 'mimo-text',
  mimoBaseUrl: 'https://mimo.example.com/v1',
  mimoTtsModel: 'mimo-tts',
  mimoSttModel: 'mimo-stt',
  anthropicTextModel: 'anthropic-text',
  cfAiGatewayBaseUrl: '',
};

describe('admin config draft', () => {
  it('把 Token 限制转换为可原样编辑的字符串', () => {
    expect(createAdminConfigDraft(CONFIG)).toEqual({
      ...CONFIG,
      dailyTokenLimit: '100000',
    });
  });

  it('提交时把 Token 限制还原为数字', () => {
    const result = parseAdminConfigDraft({
      ...createAdminConfigDraft(CONFIG),
      dailyTokenLimit: '0',
    });

    expect(result).toEqual({
      success: true,
      config: {
        ...CONFIG,
        dailyTokenLimit: 0,
      },
    });
  });

  it.each([
    '',
    '   ',
    '-1',
    '1.5',
    '9007199254740992',
    'not-a-number',
  ])('拒绝非法的 Token 限制：%j', (dailyTokenLimit) => {
    const result = parseAdminConfigDraft({
      ...createAdminConfigDraft(CONFIG),
      dailyTokenLimit,
    });

    expect(result).toEqual({
      success: false,
      field: 'dailyTokenLimit',
      error: '每日 Token 限制必须是非负安全整数',
    });
  });
});
