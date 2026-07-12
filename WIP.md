# WIP

## Phase 7 — 大规模测试覆盖补齐

长期任务，跨多次会话/提交渐进推进，每个批次对应一次独立提交。完整背景和每批的具体测试目标见规划记录（认证/计费/链上优先，其后核心业务逻辑，再其后 UI 组件）。

- [x] 批次 0：清理死代码 + 文档基线
  - [x] 删除 `packages/app/src/lib/auth.ts`（已验证零引用死代码）
  - [x] 更正 `TESTING.md` 覆盖现状描述
  - [x] 登记本批次划分到 WIP.md
- [x] 批次 1：认证与计费核心 lib（`usage-limit.ts`/`ai-usage.ts`/`auth-server.ts`/`auth-config.ts`）
- [x] 批次 2：AI 生成计费闭环 route 群（6 个 route 补测试 + 修复 TTS 记账缺口）
- [x] 批次 3：Story Protocol 链上集成（`story-protocol.ts` + `register-ip` route）——上线前仍需在测试网跑一次真实注册人工验收，测试无法替代
- [x] 批次 4：其余零覆盖 API route（24 个，拆 3 次提交）
- [ ] 批次 5：编辑器核心业务逻辑非 UI（`lib/editor/handlers/` + 3 个新拆分 hook）
- [ ] 批次 6：编辑器 UI 组件（39 个文件，拆 4-6 次提交）
- [ ] 批次 7：admin / game-player 组件
- [ ] 批次 8：sites/55、sites/jianjian 组件层
- [ ] 批次 9（可选）：cronjob + cms 自定义逻辑

已知但本阶段不修复、记入 `TODO.md` 的问题：
- `usage-limit.ts` 的 `incrementUserDailyUsage` 并发下非原子读改写，计数可能丢失（需要 D1 原子 UPDATE 或 Durable Object，架构改动，批次 1 只写特征化测试锁定现状）
