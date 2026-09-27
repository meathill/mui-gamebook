import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { CliConfig } from '../types';

const DEFAULT_ENDPOINT = 'https://muistory.com/api/mcp';

/**
 * 解析简易 key=value 文件（如 .env 或 ~/.mgbrc）
 */
function parseKeyValueFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {};
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const result: Record<string, string> = {};
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        result[key] = val;
      }
    }
    return result;
  } catch {
    return {};
  }
}

/**
 * 解析用户 CLI 配置：
 * 优先级：命令行参数 > 环境变量 MGB_API_KEY / MGB_ENDPOINT > 当前目录 .env > 用户目录 ~/.mgbrc
 */
export function resolveConfig(overrides: CliConfig = {}): Required<CliConfig> {
  let apiKey = overrides.apiKey || process.env.MGB_API_KEY;
  let endpoint = overrides.endpoint || process.env.MGB_ENDPOINT;

  // 尝试读当前目录 .env
  if (!apiKey || !endpoint) {
    const localEnv = parseKeyValueFile(path.resolve(process.cwd(), '.env'));
    apiKey = apiKey || localEnv.MGB_API_KEY || localEnv.MUI_GAMEBOOK_API_KEY;
    endpoint = endpoint || localEnv.MGB_ENDPOINT || localEnv.MUI_GAMEBOOK_ENDPOINT;
  }

  // 尝试读用户家目录 ~/.mgbrc
  if (!apiKey || !endpoint) {
    const userRc = parseKeyValueFile(path.resolve(os.homedir(), '.mgbrc'));
    apiKey = apiKey || userRc.MGB_API_KEY || userRc.apiKey;
    endpoint = endpoint || userRc.MGB_ENDPOINT || userRc.endpoint;
  }

  return {
    apiKey: apiKey || '',
    endpoint: endpoint || DEFAULT_ENDPOINT,
  };
}

export function getCredentialSource(overrides: CliConfig = {}): 'flag' | 'env' | 'local_env' | 'global_rc' | 'none' {
  if (overrides.apiKey) return 'flag';
  if (process.env.MGB_API_KEY) return 'env';
  const localEnv = parseKeyValueFile(path.resolve(process.cwd(), '.env'));
  if (localEnv.MGB_API_KEY || localEnv.MUI_GAMEBOOK_API_KEY) return 'local_env';
  const userRc = parseKeyValueFile(path.resolve(os.homedir(), '.mgbrc'));
  if (userRc.MGB_API_KEY || userRc.apiKey) return 'global_rc';
  return 'none';
}

/**
 * 将配置持久化写入用户家目录 ~/.mgbrc
 */
export function saveUserConfig(updates: Record<string, string>): void {
  const rcPath = path.resolve(os.homedir(), '.mgbrc');
  const existing = parseKeyValueFile(rcPath);
  const merged = { ...existing, ...updates };

  const lines = Object.entries(merged)
    .filter(([_, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}=${v}`);

  fs.writeFileSync(rcPath, lines.join('\n') + '\n', 'utf-8');
}

/**
 * 从 ~/.mgbrc 清除凭证
 */
export function clearUserConfig(): void {
  const rcPath = path.resolve(os.homedir(), '.mgbrc');
  if (fs.existsSync(rcPath)) {
    fs.unlinkSync(rcPath);
  }
}
