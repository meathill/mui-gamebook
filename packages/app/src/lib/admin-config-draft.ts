import type { AppConfig } from '@/lib/config';

export type AdminConfigDraft = Omit<AppConfig, 'dailyTokenLimit' | 'adminUserIds' | 'videoWhitelist'> & {
  dailyTokenLimit: string;
  adminUserIds: string;
  videoWhitelist: string;
};

export type ParseAdminConfigDraftResult =
  | { success: true; config: AppConfig }
  | {
      success: false;
      field: 'dailyTokenLimit';
      error: string;
    };

const INVALID_TOKEN_LIMIT_MESSAGE = '每日 Token 限制必须是非负安全整数';

export function createAdminConfigDraft(config: AppConfig): AdminConfigDraft {
  return {
    ...config,
    dailyTokenLimit: String(config.dailyTokenLimit),
    adminUserIds: config.adminUserIds.join('\n'),
    videoWhitelist: config.videoWhitelist.join('\n'),
  };
}

export function parseAdminConfigDraft(draft: AdminConfigDraft): ParseAdminConfigDraftResult {
  const rawTokenLimit = draft.dailyTokenLimit.trim();
  const dailyTokenLimit = Number(rawTokenLimit);

  if (rawTokenLimit === '' || !Number.isSafeInteger(dailyTokenLimit) || dailyTokenLimit < 0) {
    return {
      success: false,
      field: 'dailyTokenLimit',
      error: INVALID_TOKEN_LIMIT_MESSAGE,
    };
  }

  const { adminUserIds, videoWhitelist, ...otherFields } = draft;
  return {
    success: true,
    config: {
      ...otherFields,
      dailyTokenLimit,
      adminUserIds: parseMultilineList(adminUserIds),
      videoWhitelist: parseMultilineList(videoWhitelist),
    },
  };
}

function parseMultilineList(value: string): string[] {
  return value
    .split(/\r\n?|\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}
