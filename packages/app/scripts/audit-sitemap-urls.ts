/**
 * Sitemap URL 全量健康检查脚本
 *
 * 拉取线上 sitemap.xml，逐个检查状态码，输出分类报告。
 * 用于部署后的 SEO 验收与日常巡检（issue #18 的完成标准之一）。
 *
 * 使用方法：
 *   node --experimental-strip-types scripts/audit-sitemap-urls.ts
 *
 * 退出码：存在 5XX 时为 1，其余为 0，方便接入巡检任务。
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://muistory.com';
const DEFAULT_CONCURRENCY = 5;

interface AuditResult {
  url: string;
  status: number;
  redirectTarget?: string;
  redirectFinalStatus?: number;
}

function classify(result: AuditResult): 'ok' | 'redirect' | 'gone' | 'server_error' | 'other' {
  if (result.status === 301 || result.status === 308) {
    return 'redirect';
  }
  if (result.status === 200) {
    return 'ok';
  }
  if (result.status === 404 || result.status === 410) {
    return 'gone';
  }
  if (result.status >= 500) {
    return 'server_error';
  }
  return 'other';
}

async function fetchSitemapUrls(): Promise<string[]> {
  const sitemapUrl = `${SITE_URL}/sitemap.xml`;
  console.log(`正在获取 sitemap: ${sitemapUrl}`);

  const response = await fetch(sitemapUrl);
  if (!response.ok) {
    throw new Error(`获取 sitemap 失败: ${response.status} ${response.statusText}`);
  }

  const xml = await response.text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  console.log(`从 sitemap 获取到 ${urls.length} 个 URL`);
  return urls;
}

async function auditUrl(url: string): Promise<AuditResult> {
  const response = await fetch(url, { redirect: 'manual' });
  const result: AuditResult = { url, status: response.status };
  await response.body?.cancel();

  // 永久迁移必须验证是单跳 301/308，且目标可访问
  const location = response.headers.get('location');
  if ((result.status === 301 || result.status === 308) && location) {
    const target = new URL(location, url).toString();
    result.redirectTarget = target;
    const finalResponse = await fetch(target);
    result.redirectFinalStatus = finalResponse.status;
    await finalResponse.body?.cancel();
  }
  return result;
}

async function runWithConcurrency(urls: string[], concurrency: number): Promise<AuditResult[]> {
  const results: AuditResult[] = [];
  let cursor = 0;

  async function worker() {
    while (cursor < urls.length) {
      const url = urls[cursor++];
      try {
        results.push(await auditUrl(url));
      } catch (error) {
        // 网络层失败等价于服务不可用，按 5XX 归类
        results.push({ url, status: 599 });
        console.error(`检查失败: ${url}`, error instanceof Error ? error.message : error);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
}

async function main() {
  const concurrency = Number(process.argv[2]) || DEFAULT_CONCURRENCY;
  const urls = await fetchSitemapUrls();
  const results = await runWithConcurrency(urls, concurrency);

  const grouped = {
    ok: [] as string[],
    redirect: [] as AuditResult[],
    gone: [] as string[],
    server_error: [] as string[],
    other: [] as string[],
  };
  for (const result of results) {
    const kind = classify(result);
    if (kind === 'ok') {
      grouped.ok.push(result.url);
    } else if (kind === 'redirect') {
      grouped.redirect.push(result);
    } else if (kind === 'gone') {
      grouped.gone.push(result.url);
    } else if (kind === 'server_error') {
      grouped.server_error.push(result.url);
    } else {
      grouped.other.push(`${result.status} ${result.url}`);
    }
  }

  console.log(`\n===== 审计报告（并发 ${concurrency}）=====`);
  console.log(`200 OK        : ${grouped.ok.length}`);
  console.log(`301/308 跳转  : ${grouped.redirect.length}`);
  console.log(`404/410 已删除: ${grouped.gone.length}`);
  console.log(`5XX 服务错误  : ${grouped.server_error.length}`);
  console.log(`其他状态      : ${grouped.other.length}`);

  if (grouped.redirect.length > 0) {
    console.log('\n-- 跳转明细（须为单跳且目标 200）--');
    for (const redirect of grouped.redirect) {
      console.log(`${redirect.status} ${redirect.url} -> ${redirect.redirectFinalStatus} ${redirect.redirectTarget}`);
    }
  }
  if (grouped.gone.length > 0) {
    console.log('\n-- 已删除页面（应从 sitemap/数据源移除）--');
    for (const url of grouped.gone) console.log(url);
  }
  if (grouped.server_error.length > 0) {
    console.log('\n-- 5XX 明细 --');
    for (const url of grouped.server_error) console.log(url);
  }
  if (grouped.other.length > 0) {
    console.log('\n-- 其他状态明细 --');
    for (const line of grouped.other) console.log(line);
  }

  if (grouped.server_error.length > 0) {
    console.log('\n❌ 存在 5XX，未达标');
    process.exit(1);
  }
  console.log('\n✅ 无 5XX');
}

main().catch((error) => {
  console.error('❌ 错误:', error instanceof Error ? error.message : error);
  process.exit(1);
});
