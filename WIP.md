# WIP

DSL v2 已全部实施完成（Phase 0 止血 → Phase 1 统一表达式引擎 → Phase 2 对话行全链路 →
Phase 3 块级重定向 + AI 链路 + 规范定稿）。设计决策与阶段记录见 `docs/DSL_V2_DESIGN.md`，
现行语法规范见 `docs/DSL_SPEC.md`（规范=现实，会嵌入 AI 生成提示词）。

## 遗留验收项

- [ ] 两站点手测视觉小说流程：用一个含对话行（`@角色ID (表情): 台词`）与块级重定向
  （`-> target (if:)`）的临时剧本过一遍经典/沉浸/55/jianjian 四个播放器
  （需本地 D1 种子数据与 dev server）
- [ ] D1 生产数据清洗（见 TODO.md，需 `MUI_ADMIN_PASSWORD`）
