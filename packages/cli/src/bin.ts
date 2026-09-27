#!/usr/bin/env node
import { parseArgs } from 'util';
import { colors } from './utils/colors';
import { validateScriptFile, formatReportText } from './commands/validate';
import { previewCommand } from './commands/preview';
import { pushCommand } from './commands/push';
import { initProject } from './commands/init';
import { exportGraph } from './commands/graph';
import { loginCommand, whoamiCommand, logoutCommand } from './commands/auth';

const VERSION = '0.1.0';

function showHelp() {
  console.log(`
${colors.bold('Mui Gamebook CLI')} (mgb) - v${VERSION}
创作者与 AI Agent 的本地确定性互动小说开发工具箱。

${colors.bold('常用命令:')}
  ${colors.cyan('mgb validate <file>')}     深度排查剧本语法、未声明变量与选项卡关死局 (别名: lint)
  ${colors.cyan('mgb preview <file>')}      启动本地 Web 即时预览服务，编辑 Markdown 自动热重载 (别名: dev)
  ${colors.cyan('mgb push <file>')}         校验并推送到云端 muistory.com (别名: sync)
  ${colors.cyan('mgb login')}               登录 muistory.com，校验并保存 API Key 到本地配置
  ${colors.cyan('mgb whoami')}              查看当前登录状态与云端账号连接情况
  ${colors.cyan('mgb logout')}              退出登录，清除本地保存的凭证
  ${colors.cyan('mgb init [name]')}         初始化标准互动的起步小说剧本模板 (默认: story.md)
  ${colors.cyan('mgb graph <file>')}        导出剧情分支与多结局的 Mermaid 流程图

${colors.bold('通用选项:')}
  -v, --version             查看当前版本
  -h, --help                查看帮助信息

${colors.bold('命令参数说明:')}
  validate / lint:
    --strict                警告也视为失败 (用于严格 CI 门禁)
    --json                  输出结构化 JSON (供脚本或 Agent 消费)

  preview / dev:
    --port <number>         指定开发服务器端口 (默认: 3456)

  push / sync:
    --game <id>             指定云端游戏 ID (未指定时尝试从剧本或标题匹配)
    --key <key>             临时覆盖 API Key (默认读取本地登录凭证或环境变量)
    --dry-run               仅做云端校验，不实际落库
    --publish               同时更新发布状态 (published: true)

  login:
    --key <key>             直接传入 API Key 进行验证保存
    --endpoint <url>        指定 MCP 服务端点 (默认: https://muistory.com/api/mcp)

  graph:
    -o, --output <file>     导出 Mermaid 代码到指定文件
`);
}

async function main() {
  const rawArgs = process.argv.slice(2);

  if (rawArgs.length === 0 || rawArgs.includes('-h') || rawArgs.includes('--help')) {
    showHelp();
    return;
  }

  if (rawArgs.includes('-v') || rawArgs.includes('--version')) {
    console.log(VERSION);
    return;
  }

  const command = rawArgs[0];
  const commandArgs = rawArgs.slice(1);

  switch (command) {
    case 'validate':
    case 'lint': {
      const { values, positionals } = parseArgs({
        args: commandArgs,
        options: {
          strict: { type: 'boolean', default: false },
          json: { type: 'boolean', default: false },
        },
        allowPositionals: true,
      });

      const file = positionals[0] || 'story.md';
      const report = validateScriptFile(file, { strict: values.strict });

      if (values.json) {
        console.log(JSON.stringify(report, null, 2));
      } else {
        console.log(formatReportText(report));
      }

      if (!report.valid || (values.strict && report.warnings.length > 0)) {
        process.exit(1);
      }
      break;
    }

    case 'preview':
    case 'dev': {
      const { values, positionals } = parseArgs({
        args: commandArgs,
        options: {
          port: { type: 'string' },
        },
        allowPositionals: true,
      });

      const file = positionals[0] || 'story.md';
      const port = values.port ? parseInt(values.port, 10) : undefined;
      await previewCommand(file, { port });
      break;
    }

    case 'push':
    case 'sync': {
      const { values, positionals } = parseArgs({
        args: commandArgs,
        options: {
          game: { type: 'string' },
          key: { type: 'string' },
          endpoint: { type: 'string' },
          'dry-run': { type: 'boolean', default: false },
          publish: { type: 'boolean' },
        },
        allowPositionals: true,
      });

      const file = positionals[0] || 'story.md';
      await pushCommand(file, {
        game: values.game,
        key: values.key,
        endpoint: values.endpoint,
        dryRun: values['dry-run'],
        publish: values.publish,
      });
      break;
    }

    case 'login': {
      const { values } = parseArgs({
        args: commandArgs,
        options: {
          key: { type: 'string' },
          endpoint: { type: 'string' },
        },
        allowPositionals: true,
      });

      await loginCommand({
        key: values.key,
        endpoint: values.endpoint,
      });
      break;
    }

    case 'whoami':
    case 'status': {
      const { values } = parseArgs({
        args: commandArgs,
        options: {
          key: { type: 'string' },
          endpoint: { type: 'string' },
        },
        allowPositionals: true,
      });

      await whoamiCommand({
        key: values.key,
        endpoint: values.endpoint,
      });
      break;
    }

    case 'logout': {
      logoutCommand();
      break;
    }

    case 'init': {
      const target = commandArgs[0] || 'story.md';
      const result = initProject(target);
      if (result.success) {
        console.log(colors.green(`✨ ${result.message}`));
        console.log(colors.dim(`\n接下来可以运行:\n  mgb preview ${target}\n  mgb validate ${target}\n`));
      } else {
        console.error(colors.red(`❌ ${result.message}`));
        process.exit(1);
      }
      break;
    }

    case 'graph': {
      const { values, positionals } = parseArgs({
        args: commandArgs,
        options: {
          output: { type: 'string', short: 'o' },
        },
        allowPositionals: true,
      });

      const file = positionals[0] || 'story.md';
      const result = exportGraph(file, values.output);
      if (result.success) {
        if (values.output) {
          console.log(colors.green(`✨ ${result.message}`));
        } else {
          console.log(result.content);
        }
      } else {
        console.error(colors.red(`❌ ${result.message}`));
        process.exit(1);
      }
      break;
    }

    default:
      console.error(colors.red(`未知命令: "${command}"`));
      showHelp();
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(colors.red(`执行异常: ${(err as Error).message}`));
  process.exit(1);
});
