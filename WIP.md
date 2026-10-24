# WIP

## 任务：弹窗 + 基础组件统一迁移 coss ui，并强化素材协助邀请

计划已批准（2026-10-24）。原则：coss ui（shadcn）源码移植到 `packages/app/src/components/ui/`；token 语义角色制，`--primary` 品牌橙，violet 作自定义副色 token + 变体；`useDialog()` API 不变；select 用 native-select；`sites/55` 不动。

- [ ] C1 基建 + Button 迁移：依赖（radix alert-dialog/checkbox/tabs/label、cva、tw-animate-css）、globals.css token、components.json、`ui/` 13 个组件、Button 重写 + 10 调用方映射
- [ ] C2 弹窗统一：Dialog.tsx 重构（API 不变）、5 处 radix 直用、2 处手写弹层、api-keys window.confirm
- [ ] C3 素材协助邀请：DESCRIPTION 提取共享、工具栏中部 banner（条件 `canEnableMediaAssistance && !enabled`）、设置页 checkbox 卡片化
- [ ] C4 部件类：dropdown-menu ×4、accordion ×1（修复坏动画）、tabs ×2、pagination 统一（5 调用方）
- [ ] C5 表单控件：input/textarea/label/native-select/checkbox 机械替换（37 文件约 102 处）
- [ ] C6 收尾：banner/setting/useDialog 测试、DEV_NOTE.md 沉淀决策、format/typecheck/test/build、逐 commit 推 master + 线上冒烟
