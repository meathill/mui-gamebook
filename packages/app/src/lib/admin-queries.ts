/**
 * 后台列表用到的相关子查询片段。
 *
 * **为什么手写限定名**：drizzle 渲染 `${schema.user.id}` 得到的是不带表限定符的 `"id"`，
 * 放进子查询后会优先绑定内层表的同名列，静默算错：
 *   - `(SELECT COUNT(*) FROM Games WHERE Games.owner_id = "id")` → 恒为 0
 *   - `(SELECT SUM(open_count) FROM GameAnalytics WHERE game_id = "id")` → 每行都是同一合计值
 * 所以这里一律写成 `user.id` / `Games.id` 这样的限定名，并有 `tests/lib/subquery-qualification.test.ts` 守着。
 *
 * **表名以 `migrations/` 的建表语句为准**：是 PascalCase 的 `Games` / `GameAnalytics`，
 * 写成 snake_case 会直接 `no such table`（SQLite 只对纯大小写差异不敏感，下划线是不同的名字）。
 *
 * 单独成文件是为了能在测试里直接 import 断言渲染结果——放在 route 文件里会被鉴权等依赖拖住。
 */

import { sql } from 'drizzle-orm';

/** 用户拥有的游戏数 */
export const GAME_COUNT_SUBQUERY = sql`(SELECT COUNT(*) FROM Games WHERE Games.owner_id = user.id)`;

/** 游戏的总打开数（按 game_analytics 聚合，无记录时为 0） */
export const OPEN_COUNT_SUBQUERY = sql`(SELECT COALESCE(SUM(open_count), 0) FROM GameAnalytics WHERE GameAnalytics.game_id = Games.id)`;

/** 有效订阅的状态过滤 + 排序：active 优先，其次 trialing，最后 past_due；同期内取最新周期 */
const ACTIVE_SUBSCRIPTION_CLAUSE = sql.raw(
  `WHERE subscriptions.user_id = user.id AND status IN ('active', 'trialing', 'past_due') ` +
    `ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'trialing' THEN 1 ELSE 2 END, current_period_end DESC LIMIT 1`,
);

/** 当前有效订阅的套餐码，无有效订阅为 NULL */
export const PLAN_CODE_SUBQUERY = sql`(SELECT plan_code FROM subscriptions ${ACTIVE_SUBSCRIPTION_CLAUSE})`;

/** 当前有效订阅的状态，无有效订阅为 NULL */
export const SUBSCRIPTION_STATUS_SUBQUERY = sql`(SELECT status FROM subscriptions ${ACTIVE_SUBSCRIPTION_CLAUSE})`;
