/**
 * 工具函数模块
 */

/**
 * 带指数退避的重试函数
 */
export async function retry<T>(operation: () => Promise<T>, retries: number = 3, delay: number = 1000): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (retries <= 0) throw error;
    console.warn(`Operation failed, retrying in ${delay}ms... (${retries} retries left)`);
    await new Promise((resolve) => setTimeout(resolve, delay));
    return retry(operation, retries - 1, delay * 2);
  }
}

/**
 * 去除文件名开头的时间戳前缀（如 1768371908430-name.png -> name.png）
 */
export function stripTimestampPrefix(filename: string): string {
  return filename.replace(/^\d+-/, '');
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
  audiobook <id|slug>     生成分角色语音有声书 manifest（默认使用 mimo，只读不写回）
  audiobook-local <path>  基于本地文件生成有声书 manifest（默认使用 mimo，只读不写回）

选项:
  --provider <type>       指定 AI 提供者（google/openai/mimo），默认 google
                          （audiobook/audiobook-local 未指定时默认 mimo）
  --force                 强制重新生成所有素材（即使已有 URL/缓存）
  --dry-run               只显示将要生成的素材，不实际执行（零 AI 调用）
  --segments-only         仅 audiobook/audiobook-local：只跑分段（真实 LLM 调用），
                          跳过更贵的 TTS/上传/manifest 生成，供人工检查分段结果
  --verbose               配合 --segments-only：展示每个节点的完整分段结果
                          （默认单一旁白节点会折叠成计数，避免刷屏）
  --help, -h              显示帮助信息

环境变量:
  AI_PROVIDER             默认 AI 提供者（google/openai/mimo）
  GOOGLE_API_KEY          Google AI API Key
  OPENAI_API_KEY          OpenAI API Key
  MIMO_API_KEY            小米 MiMo API Key
  MIMO_BASE_URL           小米 MiMo Base URL（可选，默认 Token Plan 订阅地址）

示例:
  pnpm generate list
  pnpm generate remote 1
  pnpm generate remote my-game-slug --provider openai --force
  pnpm generate local demo/my-game.md
  pnpm generate audiobook-local demo/little_red_riding_hood.md --segments-only --verbose
  pnpm generate audiobook my-game-slug
`);
}
