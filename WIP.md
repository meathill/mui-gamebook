# WIP：游戏打分与评价

## 需求（已确认）

1. 任意结局后邀请打分（死亡结局自动覆盖：终点场景无选项无重定向即 `showEndScreen`）
2. 点星后弹留言框，可写详细评价
3. D1 新建 `GameRatings` 表持久化
4. 游戏展示最终评分（结局页 + 标题页 + 卡片 + JSON-LD）
5. 创作者单开管理页，可隐藏/置顶
6. 匿名可打星，登录才可留言；不做防刷
7. 只做主站 `packages/app`

## 设计

- 表 `GameRatings(id, game_id→Games cascade, user_id→user nullable, rating 1-5, content nullable, hidden default false, pinned default false, created_at, updated_at, UNIQUE(game_id,user_id))`
  - SQLite UNIQUE 允许多 NULL，匿名可多行（靠 localStorage 去重），登录 upsert
  - 公开口径：只统计 `hidden=0`；排序 `pinned DESC, created_at DESC`
- API：
  - `POST /api/games/[slug]/ratings` `{rating, content?}`：有 content 无登录 → 401 LOGIN_REQUIRED
  - `GET /api/games/[slug]/ratings`：公开 `{avg, count, distribution, ratings[]}`，登录用户额外返回 `myRating`
  - `GET /api/cms/games/[id]/ratings`：创作者（owner）全量含 hidden
  - `PATCH /api/cms/games/[id]/ratings/[ratingId]`：创作者 `{hidden?, pinned?}`
- 详情/列表透出 `avgRating/ratingCount`：`games/[slug]/route.ts`、`lib/games.ts#getGameBySlug`、列表查询（published/featured/related/byTag）LEFT JOIN 聚合子查询
- UI：新建 `RatingWidget` + `ReviewDialog`（`components/game-player/`），`EndScreen` 加 `slug/gameId` 接入；`TitleScreen` 加只读均分 props；`GameCard` 加只读均分；play 页 JSON-LD 加 `aggregateRating`
- i18n：`game` 命名空间加 `rateTitle/yourRating/averageRating/ratingCount/rateSuccess/loginToReview/reviewPlaceholder/submitReview/skipReview/myReview/hideReview/pinReview` 等，中英对齐
- 创作者页：`/my/games/[id]/ratings` + `/my/games` 卡片加“评价”入口

## 进度

- [x] schema + `migrations/0010_game_ratings.sql`（本地迁移验证）
- [x] 评分读写 API + 测试
- [x] 详情/列表透出均分 + 类型扩展
- [x] 结局打分 UI + i18n
- [x] 均分展示（TitleScreen/GameCard/JSON-LD）
- [x] 创作者管理 API + 页面
- [x] 全量测试（176 文件 1414 用例） + typecheck + format + build

## 上线前（待部署）

- 跑一次迁移：`pnpm --filter @mui-gamebook/app run db:migrate:remote` 执行 `0010_game_ratings.sql`
- 旧库无 `GameRatings` 表时公开 API/详情页静默降级为无评分，不会 500，可放心先部署再迁移
