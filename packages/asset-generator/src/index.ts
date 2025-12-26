/**
 * MUI Gamebook 素材生成器入口
 */
import type { AiProviderType } from '@mui-gamebook/core/lib/ai-provider';
import { validateRemoteEnv, setProviderType } from './lib/config';
import { showHelp } from './lib/utils';
import { handleListCommand, handleRemoteCommand, handleLocalCommand } from './commands';

async function main() {
  const args = process.argv.slice(2);

  // 解析选项
  const force = args.includes('--force');
  const dryRun = args.includes('--dry-run');
  const showHelpFlag = args.includes('--help') || args.includes('-h');

  // 解析 --provider 参数
  const providerIndex = args.findIndex((arg) => arg === '--provider');
  if (providerIndex !== -1 && args[providerIndex + 1]) {
    const providerType = args[providerIndex + 1] as AiProviderType;
    if (providerType === 'google' || providerType === 'openai') {
      setProviderType(providerType);
      console.log(`[Config] AI provider set to: ${providerType}`);
    } else {
      console.error(`错误: 无效的 provider "${providerType}"，可选值: google, openai`);
      process.exit(1);
    }
  }

  // 过滤出命令和参数
  const positionalArgs = args.filter((arg) => !arg.startsWith('--') && arg !== '-h');
  const command = positionalArgs[0];
  const argument = positionalArgs[1];

  if (showHelpFlag || !command) {
    showHelp();
    process.exit(0);
  }

  switch (command) {
    case 'list':
      await handleListCommand();
      break;

    case 'remote':
      if (!argument) {
        console.error('错误: 请提供游戏 ID 或 slug');
        console.log('用法: pnpm generate remote <id|slug> [--force] [--dry-run]');
        process.exit(1);
      }
      if (!validateRemoteEnv()) {
        process.exit(1);
      }
      await handleRemoteCommand(argument, force, dryRun);
      break;

    case 'local':
      if (!argument) {
        console.error('错误: 请提供文件路径');
        console.log('用法: pnpm generate local <path> [--force]');
        process.exit(1);
      }
      await handleLocalCommand(argument, force);
      break;

    default:
      console.error(`错误: 未知命令 "${command}"`);
      showHelp();
      process.exit(1);
  }
}

main().catch((error) => {
  console.error('发生错误:', error);
  process.exit(1);
});
