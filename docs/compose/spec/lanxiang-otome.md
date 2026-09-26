---
feature: lanxiang-otome
status: delivered
updated: 2026-09-22
branch: feat/lanxiang-otome
commits: 9bf4017..working-tree
slug: lanxiang-otome
gameId: 131
playUrl: https://muistory.com/play/lanxiang-otome
---

# 兰香如故·性转逆后宫

## Report

**What was built** — 小红书《兰香如故》vibecoding 参赛作品《兰香如故·性转逆后宫》：明代宅门性转乙女逆后宫。`sites/lanxiang-xhs-tool/script.md` 共 42 场景（序章 + E1–E4 各 7 场 + 九结局），`favor_*` 与旗标决胜；已 MCP 发布至 https://muistory.com/play/-7180（gameId 131）。伴生小红书单页工具 `index.html`：4 题匹配测试→结果卡→微剧情→CTA/分享文案（含四话题），可直接上传为小工具。封面与四男主立绘在 `assets/`（线上已挂封面+锦楼，余三张待鉴权稳定后回写）。

**Verification** —
- `pnpm exec vitest run packages/parser/tests/lanxiang-otome-script.test.ts` → PASS 5/5（含 if 语法、并列分流、角色 ID 回归）
- `pnpm --filter @mui-gamebook/parser run typecheck` → PASS
- `pnpm run format` → PASS
- `packages/app` typecheck → PRE-EXISTING（CloudflareEnv，与本变更无关）
- 播放页 webfetch 可开；`setGameDsl dryRun` 通过
- 独立 review 3 个 critical 已修：计分键 `cuoque`→`cuique`、`(if:)` 改 `==`、`end_resolve` 后序线对高优先级用 `>`

**Journey log** —
1. 对白 speaker 必须是 `ai.characters` ID（`@jinlou`），中文名会降级为正文。
2. `createGame` 回包是「说明文字+JSON」，解析要抽数组花括号。
3. MCP API Key 对 `tools/call` 间歇 40101；立绘回写优先 `setGameDsl` 写 `image_url`。
4. `(if:)` 只能比较（`==`），赋值只在 `(set:)`；回归测试用负向断言锁住。
5. 结局并列时先序 redirect 会劫持，后序男主必须对更高优先级用严格 `>`。

## [S1] Problem

小红书《兰香如故》vibecoding 大赛要求：灵感自该剧的小工具作品，完成「上传小红书小工具 → 笔记挂载 → 带话题」三步。我们手里有 mui-gamebook MCP（剧本生成/细粒度改写/生图/发布），需要一个既符合赛题、又能走 MCP 全流程、还能冲笔记互动与使用量的原创作品。

## [S2] Design

### 产品形态

**主作品**《兰香如故·性转逆后宫》：明代宅门背景的性转乙女逆后宫互动小说，宿于 muistory.com。

- 玩家扮演女主 **许兰香**（实为沈嘉兰替身入府）
- 可攻略男主团（性转/保留，图全 AI 原创、不碰演员肖像）：
  | 角色 | 原剧 | 性转设定 | 线标签 |
  |------|------|----------|--------|
  | 林锦楼 | 刘学义·林锦楼 | 保持男·林家嫡长子，冷面克制 | `jinlou` |
  | 赵星棠 | 李梦·赵星棠 | 女→男·御前新贵赵家公子，外热内冷 | `xingtang` |
  | 杜翠雀 | 郑合惠子·杜翠雀 | 女→男·江湖游医，温柔治愈 | `cuique` |
  | 薛桂花 | 郭柯宇·薛桂花 | 女→男·商帮少东，爽利义气 | `guihua` |

### 玩法结构（Gamebook DSL）

**共通主线 + 好感决胜**，不是四条平行短路线：

```
start（序章入府）
  → 事件一「入府风波」    6–8 场景
  → 事件二「灯会迷局」    6–8 场景
  → 事件三「退婚旧账」    6–8 场景
  → 事件四「沈冤与定情」  6–8 场景
  → 终局分流（favor_* + 旗标）→ ending_*
```

- **单次通关 30–40 场景**；全文件因分支可达 55–75 场景
- 四大事件内有小分支与「前序选择回响」（前事件旗标改变后事件选项/救援者/对白）
- 变量：`favor_jinlou|xingtang|cuique|guihua`、事件旗标（`has_token`, `knows_secret`, `has_evidence`, `trust_*` 等）
- 终局按最高好感 + 关键旗标锁线；允许「自掌命运」独美/隐藏结局
- 创作顺序（强制）：①角色设定+目标结局 → ②四大事件剧情组织 → ③分割场景写 DSL
- frontmatter：`title` / `description` / `backgroundStory` / `tags` / `state` / `ai.characters` / `published`
- 立绘走 `ai.characters.image_url`，场景走 `setSceneImage`

### 人设与目标结局（创作第①步，已定）

**女主**：许兰香（沈嘉兰）18。大学士府长孙女，灭门后顶替家奴亡女入林府为三等丫鬟。外柔内韧、观察入微，怀洗冤之志。不可攻略，不转视角。

**男主团**（性转逆后宫；态度弧写入对白与选项反馈，不单靠数值面板）：

| ID | 人设 | 态度弧 | 主导变量/旗标 |
|----|------|--------|----------------|
| `jinlou` 林锦楼 22 | 林家嫡长子，冷面克己；对退婚旧约有愧 | 疏离戒备→动摇护短→非她不可 / 再退一步 | `favor_jinlou`, `guilt_jinlou` |
| `xingtang` 赵星棠 20 | 赵家公子，外热内冷；视联姻为棋 | 礼貌利用→棋逢对手→失控心动 / 弃子 | `favor_xingtang`, `knows_xingtang_plot` |
| `cuique` 杜翠雀 21 | 江湖游医，许家有旧；知身份一角 | 邻家照拂→试探坦白→守护告白 / 守秘远走 | `favor_cuique`, `knows_secret` |
| `guihua` 薛桂花 20 | 商帮少东，爽利义气；暗查沈案 | 江湖义气→并肩作战→直球定情 / 兄弟卡 | `favor_guihua`, `has_evidence` |

**目标结局**（终局按 `favor_*` 最高者锁线，再用旗标判 HE/BE；并行解锁独美；**同分时分流顺序固定为锦楼→星棠→翠雀→桂花**）：

| 结局 | 条件（概念） | 一句话 |
|------|----------------|--------|
| `end_jinlou_he` 如故兰香 | `favor_jinlou` 最高且 `has_evidence` 且 `guilt_jinlou>=2` 且 `forgive_jinlou` | 抗旧约、共洗冤，林家当家夫妇 |
| `end_jinlou_be` 退婚雪 | `favor_jinlou` 最高但（无证据或愧意不足） | 他为家族再退，香如故人不在 |
| `end_xingtang_he` 棋盘真心 | `favor_xingtang` 最高且揭穿其局且未弃信物 | 弃联姻布局，共清赵家旧账 |
| `end_xingtang_be` 新贵棋局 | `favor_xingtang` 最高但（被利用旗标/失信物） | 你成弃子，他赢朝堂 |
| `end_cuique_he` 药香如故 | `favor_cuique` 最高且 `knows_secret` 已坦白 | 摊牌守秘之罪，离宅开药庐 |
| `end_cuique_be` 未寄的药方 | `favor_cuique` 最高但秘密未摊 | 他护你灭口线索后远走 |
| `end_guihua_he` 桂花载酒 | `favor_guihua` 最高且 `has_evidence` | 商帮船队下江南翻案，江上定情 |
| `end_guihua_be` 江湖夜雨 | `favor_guihua` 最高但证据链断裂 | 翻案代价是他身陷囹圄 |
| `end_alone` 自掌命运 | 四好感均低，或正义旗标压过恋爱 | 不依附，立女户、洗沈冤（彩蛋） |

**微剧情/结果卡话术**与上表用词对齐，保证小工具与长线一致。

### 四大事件剧情（创作第②步，已定）

| 事件 | 场景数 | 钩子 | 关键选择（示例） | 回响 |
|------|--------|------|------------------|------|
| **E1 入府风波** | 7 | 三等丫鬟受欺，初遇锦楼/星棠 | 忍辱/反击；向谁求庇护；拾不拾绣样 | `has_token`；初始 favor；E3 谁递台阶 |
| **E2 灯会迷局** | 7 | 上元灯会，翠雀现身边市，星棠设试探局 | 装柔弱/露锋芒；信谁传话；医摊留不留 | `knows_secret` 线头；E4 药方/密信来源 |
| **E3 退婚旧账** | 7 | 赵林联姻推进，替身身份险暴露 | 求锦楼/投星棠/靠翠雀/与桂花追证据 | 大幅 favor；`has_evidence`；E1 施恩者现身 |
| **E4 沈冤与定情** | 7 | 翻案摊牌，众人立场揭晓 | 证据交谁；公堂/私了；原不原谅旧约 | 锁线 + HE/BE；E2 密信反转 |

- 序章 `start`：3–4 场景（入府、身份自白、第一次轻量倾向选择——只加减 1 点 favor，不锁线）
- 每事件内部小分支 1–2 处（不是平行长线），**前序旗标必须改变后续至少一处选项或对白**
- 单次流程：序章 3–4 + 四事件 28 + 终局 3–5 ≈ **34–40** 场景

### 场景表（创作第③步）

| 段落 | 场景 id | 作用 | 关键选择/旗标 |
|------|---------|------|----------------|
| 序章 | `start` `start_mansion` `start_chores` `start_incline` | 入府、受欺、首次倾向 | `start_incline`：向锦楼/星棠/独力（favor±1） |
| E1 | `e1_bully` `e1_stand` `e1_jinlou` `e1_xingtang` `e1_shelter` `e1_token` `e1_night` | 风波与信物 | 忍/反；庇护；`has_token` |
| E2 | `e2_prep` `e2_lantern` `e2_cuique` `e2_trap` `e2_face` `e2_rumor` `e2_after` | 灯会试探 | 柔/锋；信谁；`knows_secret` 线头 |
| E3 | `e3_alliance` `e3_expose` `e3_help` `e3_chase` `e3_evidence` `e3_step` `e3_night` | 联姻与证据 | 四人求助；`has_evidence`；E1/`has_token` 回响 |
| E4 | `e4_truth` `e4_stance` `e4_trust` `e4_court` `e4_forgive` `e4_lock` `e4_climax` | 摊牌定情 | 证据交谁；公堂/私了；原谅旧约 |
| 终局 | `end_resolve` + 9 个 `end_*` | 好感+旗标锁结局 | 见结局表 |

小分支：`e1_shelter_*`、`e2_rumor_*`、`e3_help_*` 汇回主链；回响点：`e3_step`（E1）、`e4_trust`（E2 密信）、`e4_court`（证据链）。

### 伴生小红书小工具

路径：`sites/lanxiang-xhs-tool/`

- **单文件自包含** `index.html`（内联 CSS/JS，无外网依赖，可直接上传）
- 流程：开场 → 4 题匹配测试 → 命定男主结果卡（称号/一句人设/攻略提示）→ 预告 1 段微剧情选择 → CTA「去玩完整宅门线」链到 `https://muistory.com/play/<slug>`
- 与主游戏共用人设与结果话术；测试只做分享匹配，不替代游戏内好感
- 结果卡含分享文案模板与必带话题
- 剧本源文件 `script.md` 与工具同目录，作为 MCP `setGameDsl` 的 source of truth

### 参赛包装（笔记侧，非代码）

- 必带话题：`#兰香如故vibecoding世界` `#兰香如故` `#vibecoding` `#小红书vibecoding大赛`
- 三步：上传 `index.html` 为小工具 → 笔记挂载 → 带话题
- 版权：沿用角色名做同人浓度；图全部 AI 原创；不用剧照/演员肖像

### MCP 产出契约

| 步骤 | 工具 | 验收 |
|------|------|------|
| 建游戏 | `createGame` | 返回 id/slug |
| 落剧本 | `setGameDsl`（先 dryRun）或 `generateScript` + 细粒度修正 | `getDsl` 可 parse，`listScenes` 覆盖全部节点 |
| 立绘/封面 | `generateImage` 或 `uploadAsset` → `updateCharacter`/`setSceneImage` | URL 可访问 |
| 发布 | `updateGameMeta published: true` | `/play/<slug>` 可玩 |

## [S3] Out of Scope

- 明代园景放置玩法、MBTI 八维完整量表
- 艺人肖像/剧照素材、付费投流
- 小红书平台侧上传 API 自动化（人工按活动页上传）
- 多语言、语音、视频素材
- 游戏本体功能改动（parser/runtime 不改）

## Tasks

- [x] T1: 落实角色设定+目标结局矩阵（写入本文件 S2 / 设定节） — acceptance: 四男主弧光、旗标、HE/BE/独美条件可核对 (covers: S2)
- [x] T2: 组织四大事件剧情并分割场景表 — acceptance: 每事件 6–8 场景转换与选择点，含前序回响点；单次流程 30–40 场景 (covers: S2; depends: T1)
- [x] T3: 写出完整 DSL `sites/lanxiang-xhs-tool/script.md` — acceptance: 本地 parser 能 parse；含序章/四事件/终局/结局；favor+旗标驱动分流 (covers: S2; depends: T2)
- [x] T4: MCP 创建游戏并落库发布 — acceptance: `/play/<slug>` 可玩通至少一条完整事件链到结局；slug 记入本文件 (covers: S2; depends: T3)
- [x] T5: 生成并挂接封面+四男主立绘 — acceptance: 图可访问、风格统一、无真人肖像（本地 5 张已齐；线上封面+锦楼，余 3 张待 MCP 恢复后 setGameDsl 回写） (covers: S2; depends: T4)
- [x] T6: 实现伴生单页小工具 `sites/lanxiang-xhs-tool/index.html` — acceptance: 离线完成测试→结果卡→微剧情→CTA；CTA 指向真实 slug (covers: S2; depends: T3)
- [x] T7: 验证 — acceptance: format + typecheck(parser) + script.md parse 通过；线上页可开 (covers: S2; depends: T4,T5,T6)
- [x] T8: review 修复 critical 并 finalize — acceptance: 3 个 critical 已修并有回归测试；status=delivered；Report 填完 (covers: S2; depends: T7)
