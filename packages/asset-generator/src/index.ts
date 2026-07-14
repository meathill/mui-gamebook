/**
 * MUI Gamebook 素材生成器入口
 */
import type { AiProviderType } from '@mui-gamebook/core/lib/ai-provider';
import { validateRemoteEnv, setProviderType } from './lib/config';
import { showHelp } from './lib/utils';
import {
  handleListCommand,
  handleRemoteCommand,
  handleLocalCommand,
  handleAudiobookCommand,
  handleAudiobookLocalCommand,
} from './commands';

const AUDIOBOOK_COMMANDS = new Set(['audiobook', 'audiobook-local']);

async function main() {
  const args = process.argv.slice(2);

  // 解析选项
  const force = args.includes('--force');
  const dryRun = args.includes('--dry-run');
  const segmentsOnly = args.includes('--segments-only');
  const verbose = args.includes('--verbose');
  const showHelpFlag = args.includes('--help') || args.includes('-h');

  // 过滤出命令和参数（先于 --provider 解析，因为 audiobook/audiobook-local 的默认 provider 依赖具体命令）
  const positionalArgs = args.filter((arg) => !arg.startsWith('--') && arg !== '-h');
  const command = positionalArgs[0];
  const argument = positionalArgs[1];

  // 解析 --provider 参数
  const providerIndex = args.findIndex((arg) => arg === '--provider');
  if (providerIndex !== -1 && args[providerIndex + 1]) {
    const providerType = args[providerIndex + 1] as AiProviderType;
    if (providerType === 'google' || providerType === 'openai' || providerType === 'mimo') {
      setProviderType(providerType);
      console.log(`[Config] AI provider set to: ${providerType}`);
    } else {
      console.error(`错误: 无效的 provider "${providerType}"，可选值: google, openai, mimo`);
      process.exit(1);
    }
  } else if (command && AUDIOBOOK_COMMANDS.has(command)) {
    // audiobook/audiobook-local 未显式指定 --provider 时默认用 mimo：分角色音色是这个功能存在的唯一理由
    setProviderType('mimo');
    console.log('[Config] AI provider set to: mimo（audiobook 命令默认）');
  }

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

    case 'audiobook':
      if (!argument) {
        console.error('错误: 请提供游戏 ID 或 slug');
        console.log(
          '用法: pnpm generate audiobook <id|slug> [--force] [--segments-only] [--verbose] [--dry-run] [--provider mimo|openai|google]',
        );
        process.exit(1);
      }
      if (!validateRemoteEnv()) {
        process.exit(1);
      }
      await handleAudiobookCommand(argument, { force, dryRun, segmentsOnly, verbose });
      break;

    case 'audiobook-local':
      if (!argument) {
        console.error('错误: 请提供文件路径');
        console.log(
          '用法: pnpm generate audiobook-local <path> [--force] [--segments-only] [--verbose] [--dry-run] [--provider mimo|openai|google]',
        );
        process.exit(1);
      }
      await handleAudiobookLocalCommand(argument, { force, dryRun, segmentsOnly, verbose });
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
