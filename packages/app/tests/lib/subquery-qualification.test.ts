import { drizzle } from 'drizzle-orm/d1';
import { describe, expect, it } from 'vitest';
import {
  GAME_COUNT_SUBQUERY,
  OPEN_COUNT_SUBQUERY,
  PLAN_CODE_SUBQUERY,
  SUBSCRIPTION_STATUS_SUBQUERY,
} from '@/lib/admin-queries';
import * as schema from '@/db/schema';

/**
 * 相关子查询的限定名回归测试。
 *
 * 背景：drizzle 渲染 `${schema.user.id}` 得到的是**不带表限定符**的 `"id"`，
 * 放进子查询后会优先绑定内层表的同名列，静默算错：
 *   - `(SELECT COUNT(*) FROM Games WHERE Games.owner_id = "id")` → 恒为 0
 *   - `(SELECT SUM(open_count) FROM GameAnalytics WHERE game_id = "id")` → 每行都是同一合计值
 * 这类错误不会报错、只出错数，所以用测试把「必须带限定名」「表名大小写正确」钉死。
 */
const db = drizzle({} as never);

describe('后台列表的相关子查询使用限定列名', () => {
  it('游戏数子查询限定为 Games.owner_id = user.id', () => {
    const rendered = db.select({ gameCount: GAME_COUNT_SUBQUERY }).from(schema.user).toSQL().sql;

    expect(rendered).toContain('Games.owner_id = user.id');
    expect(rendered).not.toMatch(/owner_id = "id"/);
  });

  it('打开数子查询限定为 GameAnalytics.game_id = Games.id', () => {
    const rendered = db.select({ openCount: OPEN_COUNT_SUBQUERY }).from(schema.games).toSQL().sql;

    expect(rendered).toContain('GameAnalytics.game_id = Games.id');
    expect(rendered).not.toMatch(/game_id = "id"/);
    // 表名写成 snake_case 会 no such table
    expect(rendered).not.toContain('game_analytics');
  });

  it('套餐子查询限定为 subscriptions.user_id = user.id 并过滤有效状态', () => {
    const rendered = db.select({ planCode: PLAN_CODE_SUBQUERY }).from(schema.user).toSQL().sql;

    expect(rendered).toContain('subscriptions.user_id = user.id');
    expect(rendered).toContain("status IN ('active', 'trialing', 'past_due')");
    expect(rendered).not.toMatch(/user_id = "id"/);
  });

  it('订阅状态子查询同样带限定名', () => {
    const rendered = db.select({ status: SUBSCRIPTION_STATUS_SUBQUERY }).from(schema.user).toSQL().sql;

    expect(rendered).toContain('subscriptions.user_id = user.id');
    expect(rendered).not.toMatch(/user_id = "id"/);
  });
});
