/**
 * remote 命令 - 处理线上游戏素材
 */
import { parse, stringify } from '@mui-gamebook/parser';
import { getGameContent, updateGameContent } from '../lib/d1';
import { processGame } from '../lib/generator';
import { printUsageStats } from '../lib/usage';

export async function handleRemoteCommand(
  idOrSlug: string,
  force: boolean,
  dryRun: boolean
): Promise<void> {
  console.log(`正在获取游戏: ${idOrSlug}...\n`);

  const result = await getGameContent(idOrSlug);
  if (!result) {
    console.error(`错误: 找不到游戏 "${idOrSlug}"`);
    process.exit(1);
  }

  const { game: gameRow, content } = result;
  console.log(`游戏: ${gameRow.title} (ID: ${gameRow.id}, Slug: ${gameRow.slug})`);
  console.log(`强制模式: ${force}`);
  console.log(`预览模式: ${dryRun}\n`);

  const parseResult = parse(content);
  if (!parseResult.success) {
    console.error('解析游戏内容失败:', parseResult.error);
    process.exit(1);
  }

  const game = parseResult.data;

  if (dryRun) {
    // 预览模式：只显示将要生成的素材
    console.log('将要生成的素材:\n');

    // 角色
    if (game.ai?.characters) {
      for (const [id, char] of Object.entries(game.ai.characters)) {
        if (char.image_prompt && (!char.image_url || force)) {
          console.log(`[角色] ${char.name} (${id}): ${char.image_prompt.substring(0, 50)}...`);
        }
      }
    }

    // 封面
    if (game.cover_image?.startsWith('prompt:')) {
      console.log(`[封面] ${game.cover_image.substring(0, 60)}...`);
    }

    // 场景素材
    for (const scene of game.scenes.values()) {
      for (const node of scene.nodes) {
        if (node.type === 'ai_image' && (!node.url || force)) {
          console.log(`[场景 ${scene.id}] 图片: ${node.prompt.substring(0, 50)}...`);
        }
        if (node.type === 'ai_audio' && (!node.url || force)) {
          console.log(`[场景 ${scene.id}] 音频: ${node.prompt.substring(0, 50)}...`);
        }
        if (node.type === 'ai_video' && (!node.url || force)) {
          console.log(`[场景 ${scene.id}] 视频: ${node.prompt.substring(0, 50)}...`);
        }
      }
    }
    return;
  }

  const hasChanged = await processGame(game, force);

  if (hasChanged) {
    console.log('\n素材已更新，正在保存到数据库...');
    const newContent = stringify(game);
    await updateGameContent(gameRow.id, newContent);
    console.log('保存成功！');
  } else {
    console.log('无需生成新素材，游戏内容已是最新。');
  }

  printUsageStats();
}
