import { createRevalidatingOpenNextConfig } from '@mui-gamebook/site-common/open-next';

// 主站（含 headless 模式的 wrangler-jianjian.jsonc）有 D1，启用 tag cache
export default createRevalidatingOpenNextConfig({ tagCache: true });
