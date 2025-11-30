/**
 * 工具函数模块
 */

/**
 * 带指数退避的重试函数
 */
export async function retry<T>(
  operation: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (retries <= 0) throw error;
    console.warn(`Operation failed, retrying in ${delay}ms... (${retries} retries left)`);
    await new Promise(resolve => setTimeout(resolve, delay));
    return retry(operation, retries - 1, delay * 2);
  }
}

/**
 * 显示帮助信息
 */
export function showHelp(): void {
  console.log(`
MUI Gamebook 素材生成器

用法:
  pnpm generate <命令> [选项]

命令:
  list                    列出线上所有游戏
  remote <id|slug>        处理线上指定游戏的素材
  local <path>            处理本地文件的素材

选项:
  --force                 强制重新生成所有素材（即使已有 URL）
  --dry-run               只显示将要生成的素材，不实际执行
  --help, -h              显示帮助信息

示例:
  pnpm generate list
  pnpm generate remote 1
  pnpm generate remote my-game-slug --force
  pnpm generate local demo/my-game.md
`);
}
