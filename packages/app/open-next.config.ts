import { createRevalidatingOpenNextConfig } from '@mui-gamebook/site-common/open-next';

// 主站有 D1，启用 tag cache
export default createRevalidatingOpenNextConfig({ tagCache: true });
