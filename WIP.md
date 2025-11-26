# Work In Progress: Visual Game Editor

## 目标
将纯文本 Markdown 编辑器升级为基于节点的 **可视化编辑器 (Visual Node-Based Editor)**。

## 技术选型
- **核心库**: `@xyflow/react` (React Flow)
- **数据流**: DSL (Markdown) <-> Game Object (Parser) <-> Flow Nodes/Edges

## 开发计划

### 1. 基础建设与数据转换 (Current)
- [ ] 安装 `@xyflow/react`
- [ ] 创建 `transformers.ts`: 实现 `gameToFlow` (Import) 和 `flowToGame` (Export)
- [ ] 编写测试验证转换逻辑的正确性

### 2. 搭建画布
- [ ] 创建可视化编辑器页面 `/admin/edit/[slug]/visual` (或直接替换)
- [ ] 实现自定义节点组件 `SceneNode` (展示 ID, 缩略内容)
- [ ] 集成数据加载：API -> Parser -> `gameToFlow` -> React Flow

### 3. 节点交互与编辑
- [ ] 实现“添加场景”功能
- [ ] 开发**属性面板 (Inspector)**
    - [ ] 编辑场景 ID
    - [ ] 编辑场景描述 (Text)
    - [ ] 编辑 AI 配置 (Image/Audio Prompts)
- [ ] 实时同步：面板修改 -> 更新 Flow Node Data

### 4. 连线交互与保存
- [ ] 实现连线逻辑：连线 = 创建选项 (Choice)
- [ ] 属性面板支持连线编辑：
    - [ ] 选项文本 (Choice Text)
    - [ ] 条件判断 (If)
    - [ ] 状态更新 (Set)
- [ ] 实现保存：React Flow -> `flowToGame` -> Stringify -> API PUT

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
