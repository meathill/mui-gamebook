import * as readline from 'readline/promises';
import { exec } from 'child_process';
import { colors } from '../utils/colors';
import { resolveConfig, saveUserConfig, clearUserConfig, getCredentialSource } from '../utils/config';
import { McpClient } from '../utils/mcp-client';

const API_KEYS_URL = 'https://muistory.com/my/api-keys';

function openBrowser(url: string) {
  const cmd =
    process.platform === 'darwin'
      ? `open "${url}"`
      : process.platform === 'win32'
        ? `start "${url}"`
        : `xdg-open "${url}"`;
  exec(cmd, () => {});
}

export async function loginCommand(options: { key?: string; endpoint?: string } = {}): Promise<void> {
  let apiKey = options.key?.trim();

  if (!apiKey) {
    console.log('');
    console.log(colors.bold(colors.cyan('🔐 Mui Gamebook CLI 登录认证')));
    console.log(colors.dim('正在尝试在浏览器中打开 API 密钥管理页...'));
    console.log(`直达地址: ${colors.underline(colors.cyan(API_KEYS_URL))}`);
    console.log(colors.dim('（请在控制台生成或复制以 mgb_ 开头的密钥）\n'));

    try {
      openBrowser(API_KEYS_URL);
    } catch {}

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    try {
      apiKey = (await rl.question(colors.bold('请输入你的 API Key (mgb_...): '))).trim();
    } finally {
      rl.close();
    }
  }

  if (!apiKey) {
    console.error(colors.red('❌ 未输入 API Key，登录已取消。'));
    process.exit(1);
  }

  const endpoint = options.endpoint || 'https://muistory.com/api/mcp';

  console.log(colors.dim('正在向云端验证密钥有效性...'));
  const client = new McpClient({ apiKey, endpoint });
  const checkRes = await client.listGames();

  if (!checkRes.success) {
    console.error(colors.red(`❌ 密钥验证失败: ${checkRes.error}`));
    process.exit(1);
  }

  saveUserConfig({
    apiKey,
    endpoint,
  });

  const gamesCount = Array.isArray(checkRes.data) ? checkRes.data.length : 0;

  console.log('');
  console.log(colors.bold(colors.green('✨ 登录成功！')));
  console.log(`  • 认证端点: ${colors.bold(endpoint)}`);
  console.log(`  • 名下游戏: ${colors.bold(gamesCount)} 部在线作品`);
  console.log(`  • 凭证存储: ${colors.dim('~/.mgbrc (全局生效，下次操作免输入)')}`);
  console.log('');
}

export async function whoamiCommand(options: { key?: string; endpoint?: string } = {}): Promise<void> {
  const config = resolveConfig({ apiKey: options.key, endpoint: options.endpoint });
  const source = getCredentialSource({ apiKey: options.key, endpoint: options.endpoint });

  if (!config.apiKey) {
    console.log(colors.yellow('⚠️ 当前未登录或未配置任何 API Key。'));
    console.log(colors.dim('你可以运行 `mgb login` 完成登录认证。'));
    return;
  }

  const maskedKey = config.apiKey.length > 10 ? `${config.apiKey.slice(0, 6)}...${config.apiKey.slice(-4)}` : '***';

  const sourceLabels = {
    flag: '--key 参数',
    env: '环境变量 (MGB_API_KEY)',
    local_env: '本地 .env 文件',
    global_rc: '全局配置 (~/.mgbrc)',
    none: '未配置',
  };

  console.log('');
  console.log(colors.bold('👤 当前认证状态:'));
  console.log(`  • API Key: ${colors.cyan(maskedKey)}`);
  console.log(`  • 凭证来源: ${colors.dim(sourceLabels[source])}`);
  console.log(`  • 服务端点: ${colors.dim(config.endpoint)}`);

  console.log(colors.dim('正在验证远程连接与权限...'));
  const client = new McpClient(config);
  const listRes = await client.listGames();

  if (!listRes.success) {
    console.log(`  • 连接状态: ${colors.red('❌ 验证失败 - ' + listRes.error)}`);
  } else {
    const games = Array.isArray(listRes.data) ? listRes.data : [];
    console.log(`  • 连接状态: ${colors.green('✓ 鉴权有效，服务连接正常')}`);
    console.log(`  • 云端作品: 共 ${colors.bold(games.length)} 部`);
    if (games.length > 0) {
      games.slice(0, 5).forEach((g: any) => {
        console.log(`    - [${g.id}] ${g.title} (${g.slug || '未发布'})`);
      });
      if (games.length > 5) {
        console.log(colors.dim(`    ... 还有 ${games.length - 5} 部作品`));
      }
    }
  }
  console.log('');
}

export function logoutCommand(): void {
  clearUserConfig();
  console.log(colors.green('✓ 已清除本地 ~/.mgbrc 中的登录凭证。'));
}
