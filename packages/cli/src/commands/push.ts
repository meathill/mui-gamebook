import * as fs from 'fs';
import * as path from 'path';
import { parse } from '@roudanio/parser';
import { colors } from '../utils/colors';
import { resolveConfig } from '../utils/config';
import { McpClient } from '../utils/mcp-client';
import { validateScriptContent, formatReportText } from './validate';

export interface PushOptions {
  game?: string | number;
  key?: string;
  endpoint?: string;
  dryRun?: boolean;
  publish?: boolean;
}

export async function pushCommand(filePath: string, options: PushOptions = {}): Promise<void> {
  const resolvedPath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(colors.red(`❌ 文件不存在: ${filePath}`));
    process.exit(1);
  }

  const content = fs.readFileSync(resolvedPath, 'utf-8');

  // 1. 本地前置校验
  console.log(colors.dim('正在进行本地 DSL 静态语法与死局体检...'));
  const report = validateScriptContent(content, filePath);
  if (!report.valid) {
    console.error(formatReportText(report));
    console.error(colors.red('❌ 本地校验存在阻断性错误，已中止推送。请先修复上述错误后再同步！'));
    process.exit(1);
  }

  // 2. 解析配置与 API Key
  const config = resolveConfig({
    apiKey: options.key,
    endpoint: options.endpoint,
  });

  if (!config.apiKey) {
    console.error(
      colors.red('❌ 缺少 API Key！请通过参数 --key 传入，或在环境变量设置 MGB_API_KEY，或配置在 ~/.mgbrc 文件中。'),
    );
    process.exit(1);
  }

  const client = new McpClient(config);

  // 3. 确定目标 Game ID
  let targetGameId: string | number | undefined = options.game;

  // 尝试从 frontmatter 读取
  const parsed = parse(content);
  if (!parsed.success) {
    console.error(colors.red(`❌ 剧本解析失败: ${parsed.error}`));
    process.exit(1);
  }
  const game = parsed.data;

  if (!targetGameId) {
    const rawGame: any = game;
    if (rawGame.id || rawGame.gameId) {
      targetGameId = rawGame.id || rawGame.gameId;
    }
  }

  // 若仍无 gameId，通过 title 查询用户已有的游戏列表
  if (!targetGameId) {
    console.log(colors.dim('正在查询名下游戏列表...'));
    const listRes = await client.listGames();
    if (!listRes.success) {
      console.error(colors.red(`❌ 获取云端游戏列表失败: ${listRes.error}`));
      process.exit(1);
    }

    const games = Array.isArray(listRes.data) ? listRes.data : [];
    const matched = games.find((g: any) => g.title === game.title);
    if (matched) {
      targetGameId = matched.id;
      console.log(colors.cyan(`✓ 根据标题 "${game.title}" 自动匹配到游戏 ID: ${targetGameId}`));
    } else {
      console.error(colors.yellow(`⚠️ 未指定目标游戏 ID，且未在名下找到同名游戏 "${game.title}"。`));
      if (games.length > 0) {
        console.log(colors.bold('\n你在云端的可用游戏列表:'));
        games.forEach((g: any) => {
          console.log(`  • ID: ${colors.bold(g.id)} | 标题: ${g.title} (${g.slug || 'no-slug'})`);
        });
        console.log(colors.dim(`\n请通过 --game <ID> 指定目标，例如: mgb push ${filePath} --game ${games[0].id}`));
      } else {
        console.log(colors.dim('你在云端暂无游戏，请先在 muistory.com 或通过 Agent 创建新游戏。'));
      }
      process.exit(1);
    }
  }

  if (!targetGameId) {
    process.exit(1);
  }
  const finalGameId = targetGameId;

  // 4. 执行 setGameDsl
  const isDryRun = options.dryRun === true;
  console.log(
    colors.dim(
      `正在向云端 ${config.endpoint} ${isDryRun ? '预检 (dryRun)' : '推送'} 剧本 (Game ID: ${finalGameId})...`,
    ),
  );

  const pushRes = await client.setGameDsl(finalGameId, content, isDryRun);
  if (!pushRes.success) {
    console.error(colors.red(`❌ 推送失败: ${pushRes.error}`));
    process.exit(1);
  }

  if (isDryRun) {
    console.log('');
    console.log(colors.bold(colors.green('✨ 远端 dryRun 校验通过！')));
    console.log(colors.dim('云端已确认语法与逻辑完全合法，未实际写库。去掉 --dry-run 即可正式落库。'));
    return;
  }

  // 5. 更新发布状态（如果显式指定了）
  if (options.publish !== undefined) {
    console.log(colors.dim(`正在更新发布状态 (published: ${options.publish})...`));
    await client.updateGameMeta(finalGameId, { published: options.publish });
  }

  console.log('');
  console.log(colors.bold(colors.green('🎉 剧本同步成功！')));
  console.log(`  • 游戏 ID: ${colors.bold(finalGameId)}`);
  console.log(`  • 剧本标题: ${colors.bold(game.title || '未命名')}`);
  console.log(`  • 线上游玩/管理: ${colors.cyan(`https://muistory.com/my/edit/${finalGameId}`)}`);
  console.log('');
}
