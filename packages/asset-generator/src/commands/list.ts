/**
 * list 命令 - 列出所有游戏
 */
import { listGames } from '../lib/d1';

export async function handleListCommand(): Promise<void> {
  console.log('正在获取线上游戏列表...\n');
  
  const games = await listGames();
  
  if (games.length === 0) {
    console.log('暂无游戏');
    return;
  }

  console.log('ID\tSlug\t\t\tTitle');
  console.log('-'.repeat(60));
  for (const game of games) {
    console.log(`${game.id}\t${game.slug.padEnd(20)}\t${game.title}`);
  }
  console.log(`\n共 ${games.length} 个游戏`);
}
