/**
 * Cloudflare Workers secret 环境变量类型补充
 * wrangler types 只生成 vars 中声明的变量，secret 需要手动声明
 */
declare namespace Cloudflare {
  interface Env {
    ADMIN_PASSWORD?: string;
    GOOGLE_AI_KEY?: string;
    GOOGLE_API_KEY_NEW?: string;
    OPENAI_API_KEY?: string;
    NEXT_PUBLIC_ROOT_USER_EMAIL?: string;
    STORY_PRIVATE_KEY?: string;
    PINATA_JWT?: string;
  }
}
