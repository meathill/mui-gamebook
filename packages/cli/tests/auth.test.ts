import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { logoutCommand } from '../src/commands/auth';
import { resolveConfig, saveUserConfig, clearUserConfig, getCredentialSource } from '../src/utils/config';

vi.mock('os', async () => ({
  ...(await vi.importActual<typeof import('os')>('os')),
  homedir: vi.fn(),
}));

describe('Auth & Config', () => {
  let directory: string;
  let rcPath: string;

  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mui-cli-auth-'));
    rcPath = path.join(directory, '.mgbrc');
    vi.mocked(os.homedir).mockReturnValue(directory);
    vi.spyOn(process, 'cwd').mockReturnValue(directory);
    vi.stubEnv('MGB_API_KEY', '');
    vi.stubEnv('MGB_ENDPOINT', '');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    fs.rmSync(directory, { recursive: true, force: true });
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
