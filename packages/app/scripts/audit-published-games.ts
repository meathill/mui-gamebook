/**
 * 存量已发布作品的 NSFW 批量审查
 *
 * 逐个调用 POST /api/admin/games/[slug]/moderate（违禁词 + LLM 审查），
 * 输出可疑清单。只读：审查端点不做任何状态变更，处置（下架/封禁/封号）需人工确认。
 *
 * 使用方法：
 *   ADMIN_PASSWORD=<密钥> MUISTORY_SITE=<站点地址> node --experimental-strip-types scripts/audit-published-games.ts
 *
 * 可选参数：
 *   --site https://muistory.com   覆盖站点地址（默认 MUISTORY_SITE 或 https://muistory.com）
 *   --limit 50                    最多审查多少个（默认全部）
 */

interface ModerateResult {
  slug: string;
  pass: boolean;
  source: string;
  reason: string | null;
}

interface GamesResponse {
  games: Array<{ slug: string; title: string; published: boolean; shadowBanned: boolean }>;
  pagination: { page: number; totalPages: number; total: number };
}

function getArgValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
}

/** 独立命名避免与其他脚本的 main 重复声明冲突（同项目 tsc 联合编译） */
async function auditPublishedGamesMain() {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    console.error(
      '缺少 ADMIN_PASSWORD 环境变量（ADMIN_PASSWORD=<密钥> node --experimental-strip-types scripts/audit-published-games.ts）',
    );
    process.exit(1);
  }
  const site = (getArgValue('--site') ?? process.env.MUISTORY_SITE ?? 'https://muistory.com').replace(/\/$/, '');
  const limit = Number(getArgValue('--limit') ?? Number.POSITIVE_INFINITY);

  const headers = { Authorization: `Bearer ${adminPassword}`, 'Content-Type': 'application/json' };

  // 分页拉取全部已发布且未封禁的作品
  const publishedGames: Array<{ slug: string; title: string }> = [];
  let page = 1;
  let totalPages = 1;
  do {
    const res = await fetch(`${site}/api/admin/games?page=${page}&limit=50&status=published`, { headers });
    if (!res.ok) throw new Error(`拉取游戏列表失败: ${res.status} ${await res.text()}`);
    const data = (await res.json()) as GamesResponse;
    totalPages = data.pagination.totalPages;
    for (const game of data.games) {
      if (!game.shadowBanned) publishedGames.push({ slug: game.slug, title: game.title });
    }
    page += 1;
  } while (page <= totalPages);
  console.log(`共 ${publishedGames.length} 个已发布作品待审查\n`);

  const suspects: ModerateResult[] = [];
  let audited = 0;
  for (const game of publishedGames) {
    if (audited >= limit) break;
    const res = await fetch(`${site}/api/admin/games/${encodeURIComponent(game.slug)}/moderate`, {
      method: 'POST',
      headers,
    });
    audited += 1;
    if (!res.ok) {
      console.warn(`[跳过] ${game.slug}：审查请求失败 ${res.status}`);
      continue;
    }
    const verdict = (await res.json()) as ModerateResult;
    if (verdict.pass) {
      console.log(`[通过] ${game.slug}`);
    } else {
      suspects.push(verdict);
      console.warn(`[可疑] ${game.slug}（${verdict.source}）：${verdict.reason ?? ''}`);
    }
  }

  console.log(`\n审查完成：${audited}/${publishedGames.length}，可疑 ${suspects.length} 个`);
  if (suspects.length > 0) {
    console.log('\n可疑清单：');
    for (const suspect of suspects) {
      console.log(`  ${suspect.slug}（${suspect.source}）：${suspect.reason ?? ''}`);
    }
  }
}

auditPublishedGamesMain().catch((error) => {
  console.error('审查脚本失败:', error);
  process.exit(1);
});
