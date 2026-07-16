# WIP

DSL v2 已全部实施完成（Phase 0 止血 → Phase 1 统一表达式引擎 → Phase 2 对话行全链路 →
Phase 3 块级重定向 + AI 链路 + 规范定稿）。设计决策与阶段记录见 `docs/DSL_V2_DESIGN.md`，
现行语法规范见 `docs/DSL_SPEC.md`（规范=现实，会嵌入 AI 生成提示词）。

## 遗留验收项

- [x] 手测（2026-07-15，经典 + 沉浸模式，本地 D1 种子剧本「V2 手测」）：对话行含表情/全角标点、
  中文变量插值、`{{if}}` 双分支、`or` 表达式、`set` 加法、正文场景「继续」按钮、纯路由场景
  自动跳转全部通过，控制台零应用错误。55/jianjian 站共用同一 hook，其渲染路径由组件测试覆盖，
  未单独起站手测
- [ ] **D1 生产清洗待用户确认执行**：35 个游戏已只读摸底，10 个待写（3 个旧围栏迁移 err1→0、
  5 个模板污染清洗、2 个老转义产物 parse→stringify 规范化），全部通过结构等价校验。
  原始备份 `~/mui-gamebook-d1-backup-2026-07-15.json`，待执行 SQL
  `~/mui-gamebook-d1-cleanup-2026-07-15.sql`（执行命令见文件旁注释或直接
  `cd packages/app && npx wrangler d1 execute mui-gamebook --remote --file ~/mui-gamebook-d1-cleanup-2026-07-15.sql`）。
  教训已固化：migrate 脚本新增防缩水护栏（老转义标题会让场景重建吞内容）
