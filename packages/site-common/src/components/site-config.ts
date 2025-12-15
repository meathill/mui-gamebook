/**
 * 站点模板配置
 * 新站点创建时参考这些配置
 */

export interface SiteConfig {
  /** 站点内部名称 */
  name: string;
  /** 站点显示名称 */
  displayName: string;
  /** Admin API 地址 */
  apiUrl: string;
  /** 站点域名 */
  siteUrl: string;
  /** Cookie 域名（用于跨子域认证） */
  cookieDomain?: string;
}

/**
 * 创建站点配置
 */
export function createSiteConfig(config: SiteConfig): SiteConfig {
  return {
    ...config,
    cookieDomain: config.cookieDomain || `.${new URL(config.siteUrl).hostname.split('.').slice(-2).join('.')}`,
  };
}

/**
 * 从环境变量创建配置
 */
export function createSiteConfigFromEnv(): Partial<SiteConfig> {
  return {
    apiUrl: process.env.NEXT_PUBLIC_API_URL,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
  };
}

/**
 * 站点创建指南
 *
 * 1. 在 sites/ 下创建新目录
 * 2. 复制以下配置文件模板：
 *    - package.json
 *    - next.config.ts
 *    - open-next.config.ts
 *    - wrangler.jsonc
 *    - tsconfig.json
 *    - postcss.config.mjs
 *
 * 3. 创建 src/app 目录结构：
 *    - layout.tsx (自定义布局和品牌)
 *    - page.tsx (自定义首页)
 *    - globals.css (自定义主题)
 *
 * 4. 使用 @mui-gamebook/site-common 提供的功能：
 *    - createApiClient 创建 API 客户端
 *    - useGamePlayer 获取游戏状态管理
 *
 * 5. 运行 pnpm install 安装依赖
 * 6. 运行 pnpm dev 启动开发服务器
 */
