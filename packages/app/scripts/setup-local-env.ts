/**
 * 生成本地 .env（构建期变量），不会覆盖已存在的 .env
 * 用法：pnpm --filter @mui-gamebook/app exec node --experimental-strip-types scripts/setup-local-env.ts
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const envPath = join(appRoot, '.env');
const examplePath = join(appRoot, '.env.example');

if (existsSync(envPath)) {
  console.log('.env 已存在，不做任何改动');
  process.exit(0);
}

// 从 wrangler.jsonc / 生产配置里已知的公开值（NEXT_PUBLIC_* 本就是打进客户端产物的公开变量）
const knownValues: Record<string, string> = {
  NEXT_PUBLIC_SITE_URL: 'https://muistory.com',
  NEXT_PUBLIC_GA_ID: 'G-244NXPS1H0',
  NEXT_PUBLIC_ROOT_USER_EMAIL: 'meathill@gmail.com',
};

const template = readFileSync(examplePath, 'utf-8');
const filled = template
  .split('\n')
  .map((line) => {
    const match = line.match(/^([A-Z0-9_]+)=$/);
    if (match && knownValues[match[1]]) {
      return `${match[1]}=${knownValues[match[1]]}`;
    }
    return line;
  })
  .join('\n');

writeFileSync(envPath, filled);
console.log('已生成 .env，请检查并按需补充其余变量（如 CMS_API_URL、Google 登录等）');
