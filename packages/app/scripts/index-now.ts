/**
 * IndexNow 提交脚本 - 用于 Bing Webmaster
 *
 * 使用方法：
 * 1. 确保设置环境变量 INDEXNOW_KEY（或在 .env 中配置）
 * 2. 运行：node --experimental-strip-types scripts/index-now.ts [urls...]
 *
 * 示例：
 * - 提交单个 URL：node --experimental-strip-types scripts/index-now.ts https://muistory.com/play/new-game
 * - 提交多个 URL：node --experimental-strip-types scripts/index-now.ts https://muistory.com/play/game1 https://muistory.com/play/game2
 * - 提交所有页面：node --experimental-strip-types scripts/index-now.ts --all
 */

import { config } from 'dotenv';
config();

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://muistory.com';
const INDEXNOW_KEY = process.env.INDEXNOW_KEY;
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';

interface IndexNowPayload {
  host: string;
  key: string;
  keyLocation: string;
  urlList: string[];
}

/**
 * 从 sitemap 获取所有 URL
 */
async function fetchSitemapUrls(): Promise<string[]> {
  const sitemapUrl = `${SITE_URL}/sitemap.xml`;
  console.log(`正在获取 sitemap: ${sitemapUrl}`);

  const response = await fetch(sitemapUrl);
  if (!response.ok) {
    throw new Error(`获取 sitemap 失败: ${response.status} ${response.statusText}`);
  }

  const xml = await response.text();
  // 简单解析 XML 中的 <loc> 标签
  const urlMatches = xml.matchAll(/<loc>([^<]+)<\/loc>/g);
  const urls: string[] = [];
  for (const match of urlMatches) {
    urls.push(match[1]);
  }

  console.log(`从 sitemap 获取到 ${urls.length} 个 URL`);
  return urls;
}

/**
 * 提交 URL 到 IndexNow
 */
async function submitToIndexNow(urls: string[]): Promise<void> {
  if (!INDEXNOW_KEY) {
    throw new Error('请设置 INDEXNOW_KEY 环境变量');
  }

  if (urls.length === 0) {
    console.log('没有 URL 需要提交');
    return;
  }

  const host = new URL(SITE_URL).host;
  const payload: IndexNowPayload = {
    host,
    key: INDEXNOW_KEY,
    keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
    urlList: urls,
  };

  console.log(`正在提交 ${urls.length} 个 URL 到 IndexNow...`);
  console.log('提交的 URL:', urls.slice(0, 5).join('\n  '));
  if (urls.length > 5) {
    console.log(`  ... 以及另外 ${urls.length - 5} 个 URL`);
  }

  const response = await fetch(INDEXNOW_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(payload),
  });

  if (response.ok || response.status === 202) {
    console.log('✅ 提交成功！');
    console.log(`状态码: ${response.status}`);
  } else {
    const errorText = await response.text();
    throw new Error(`提交失败: ${response.status} ${response.statusText}\n${errorText}`);
  }
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
IndexNow 提交脚本 - 用于 Bing Webmaster

使用方法：
  node --experimental-strip-types scripts/index-now.ts [options] [urls...]

选项：
  --all       提交 sitemap 中的所有 URL
  --help      显示帮助信息

示例：
  node --experimental-strip-types scripts/index-now.ts --all
  node --experimental-strip-types scripts/index-now.ts https://muistory.com/play/new-game
  node --experimental-strip-types scripts/index-now.ts https://muistory.com/play/game1 https://muistory.com/play/game2

环境变量：
  INDEXNOW_KEY          必需，你的 IndexNow API key
  NEXT_PUBLIC_SITE_URL  可选，网站 URL（默认：https://muistory.com）

配置步骤：
  1. 生成一个随机 key（推荐使用 UUID 格式）
  2. 创建文件 public/{key}.txt，内容为 key 本身
  3. 设置环境变量 INDEXNOW_KEY
  4. 运行此脚本提交 URL
`);
    return;
  }

  if (args.includes('--help')) {
    console.log('请不带参数运行以查看帮助信息');
    return;
  }

  let urls: string[];

  if (args.includes('--all')) {
    urls = await fetchSitemapUrls();
  } else {
    urls = args.filter((arg) => !arg.startsWith('--'));
    // 验证 URL 格式
    for (const url of urls) {
      try {
        new URL(url);
      } catch {
        throw new Error(`无效的 URL: ${url}`);
      }
    }
  }

  await submitToIndexNow(urls);
}

main().catch((error) => {
  console.error('❌ 错误:', error.message);
  process.exit(1);
});
