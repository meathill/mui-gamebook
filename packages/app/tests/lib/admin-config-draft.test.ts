import { describe, expect, it } from 'vitest';
import { createAdminConfigDraft, parseAdminConfigDraft } from '@/lib/admin-config-draft';
import type { AppConfig } from '@/lib/config';

const CONFIG: AppConfig = {
  dailyTokenLimit: 100000,
  adminUserIds: ['admin-1', 'admin-2'],
  videoWhitelist: ['one@example.com', 'two@example.com'],
  defaultAiProvider: 'google',
  defaultTtsProvider: 'mimo',
  googleTextModel: 'google-text',
  googleImageModel: 'google-image',
  googleTtsModel: 'google-tts',
  googleVideoModel: 'google-video',
  openaiTextModel: 'openai-text',
  openaiImageModel: 'openai-image',
  openaiTtsModel: 'openai-tts',
  openaiVideoModel: 'openai-video',
  mimoTextModel: 'mimo-text',
  mimoBaseUrl: 'https://mimo.example.com/v1',
  mimoTtsModel: 'mimo-tts',
  anthropicTextModel: 'anthropic-text',
  cfAiGatewayBaseUrl: '',
};

describe('admin config draft', () => {
  it('把数组和 Token 限制转换为可原样编辑的字符串', () => {
    expect(createAdminConfigDraft(CONFIG)).toEqual({
      ...CONFIG,
      dailyTokenLimit: '100000',
      adminUserIds: 'admin-1\nadmin-2',
      videoWhitelist: 'one@example.com\ntwo@example.com',
    });
  });

  it('只在提交时整理多行内容，并保留顺序、大小写和重复项', () => {
    const result = parseAdminConfigDraft({
      ...createAdminConfigDraft(CONFIG),
      dailyTokenLimit: '0',
      adminUserIds: ' Admin-A \n\nadmin-a\n Admin-A ',
      videoWhitelist: ' First@Example.com\r\n second@example.com \nFirst@Example.com',
    });

    expect(result).toEqual({
      success: true,
      config: {
        ...CONFIG,
        dailyTokenLimit: 0,
        adminUserIds: ['Admin-A', 'admin-a', 'Admin-A'],
        videoWhitelist: ['First@Example.com', 'second@example.com', 'First@Example.com'],
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
