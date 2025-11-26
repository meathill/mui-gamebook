# Work In Progress: Visual Game Editor

## 目标
将纯文本 Markdown 编辑器升级为基于节点的 **可视化编辑器 (Visual Node-Based Editor)**。

## 技术选型
- **核心库**: `@xyflow/react` (React Flow)
- **数据流**: DSL (Markdown) <-> Game Object (Parser) <-> Flow Nodes/Edges

## 开发计划

### 1. 基础建设与数据转换 (Completed)
- [x] 安装 `@xyflow/react`
- [x] 创建 `transformers.ts`: 实现 `gameToFlow` (Import) 和 `flowToGame` (Export)
- [x] 编写测试验证转换逻辑的正确性

### 2. 搭建画布 (Completed)
- [x] 创建可视化编辑器页面 `/admin/edit/[slug]` (直接替换)
- [x] 实现自定义节点组件 `SceneNode`
- [x] 集成数据加载：API -> Parser -> `gameToFlow` -> React Flow
- [x] 实现 Visual/Text 模式双向切换与同步

### 3. 节点交互与编辑 (Completed)
- [x] 实现“添加场景”功能
- [x] 开发**属性面板 (Inspector)**
    - [x] 编辑场景 ID (只读)
    - [x] 编辑场景描述 (Text)
    - [x] 编辑 AI 配置 (Read-only view implemented)
- [x] 实时同步：面板修改 -> 更新 Flow Node Data

### 4. 连线交互与保存 (Completed)
- [x] 实现连线逻辑：连线 = 创建选项 (Choice)
- [x] 属性面板支持连线编辑：
    - [x] 选项文本 (Choice Text)
    - [x] 条件判断 (If)
    - [x] 状态更新 (Set)
- [x] 实现保存：React Flow -> `flowToGame` -> Stringify -> API PUT

## 后续增强计划 (Enhancements)

### 5. 资产管理 (Assets Management)
- [ ] 在 Inspector 中支持添加/删除 `ai_image` / `ai_audio` / `video-gen`
- [ ] 编辑 Asset Prompt 和属性
- [ ] 支持预览 Asset 图片 URL

### 6. 高级编辑功能
- [ ] **场景重命名**：修改 Scene ID 并自动更新相关连线
- [ ] **自动布局 (Auto Layout)**：一键整理节点位置 (dagre/elk)


## 数据映射设计

### Node (Scene)
- `id`: `scene.id`
- `data`:
    - `content`: 场景文本
    - `assets`: 场景内的图片/音频配置
    - `label`: 场景 ID (用于显示)

### Edge (Choice)
- `source`: 当前场景 ID
- `target`: 目标场景 ID
- `label`: 选项文本
- `data`:
    - `condition`: `if` 逻辑
    - `set`: `set` 逻辑
