# Work In Progress

## 最近完成

### 角色管理和 AI 引导功能 (2024-11-29)
- [x] 添加"角色"Tab 到编辑器
- [x] 角色编辑器（两列布局）
- [x] 角色头像 AI 生成 API
- [x] 角色头像上传功能
- [x] 解析剧本自动填充角色、变量、设置（已在 handleScriptImport 中实现）
- [x] AI 故事生成引导提示（5个示例）

### Dialog 组件优化 (2024-11-29)
- [x] 使用 Radix UI 重写 Dialog 组件
- [x] 替换所有 alert/confirm 调用为 React Dialog
- [x] 支持 alert、confirm、success、error 四种类型

### 背景故事功能 (2024-11-29)
- [x] 修复 backgroundStory 解析问题（兼容驼峰和下划线格式）
- [x] API 返回 backgroundStory 字段
- [x] 游戏页面显示背景故事（Markdown 渲染）
- [x] 安装 react-markdown 和 @tailwindcss/typography

### 变量管理系统
- [x] 更新 DSL 规范 - 添加变量元数据格式
- [x] 更新类型定义 - Variable 接口和辅助函数
- [x] 前端变量编辑器（两列布局）
- [x] 游戏播放器显示可见变量
- [x] 变量触发器逻辑

## 待办事项

### 优化和改进
- [ ] 国际化支持
- [ ] 更多的变量展示图标选项
- [ ] 游戏分享功能优化
