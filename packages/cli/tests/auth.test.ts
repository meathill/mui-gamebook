import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { logoutCommand } from '../src/commands/auth';
import { resolveConfig, saveUserConfig, clearUserConfig, getCredentialSource } from '../src/utils/config';

describe('Auth & Config', () => {
  const rcPath = path.resolve(os.homedir(), '.mgbrc');
  let originalRc: string | null = null;

  beforeEach(() => {
    if (fs.existsSync(rcPath)) {
      originalRc = fs.readFileSync(rcPath, 'utf-8');
    }
  });

  afterEach(() => {
    if (originalRc !== null) {
      fs.writeFileSync(rcPath, originalRc, 'utf-8');
    } else if (fs.existsSync(rcPath)) {
      fs.unlinkSync(rcPath);
    }
  });

  it('saveUserConfig 正确写入 ~/.mgbrc 并被 resolveConfig 识别', () => {
    saveUserConfig({
      apiKey: 'mgb_test_rc_key_999',
      endpoint: 'https://test.muistory.com/api/mcp',
    });

    const cfg = resolveConfig();
    expect(cfg.apiKey).toBe('mgb_test_rc_key_999');
    expect(cfg.endpoint).toBe('https://test.muistory.com/api/mcp');
  });

  it('logoutCommand 与 clearUserConfig 正确清除凭证', () => {
    saveUserConfig({ apiKey: 'mgb_to_remove' });
    expect(fs.existsSync(rcPath)).toBe(true);

    logoutCommand();
    expect(fs.existsSync(rcPath)).toBe(false);
  });

  it('getCredentialSource 准确区分凭证来源', () => {
    expect(getCredentialSource({ apiKey: 'from_param' })).toBe('flag');
  });
});
