# Work In Progress: 变量管理系统

## 目标
实现完整的变量管理功能，允许作者创建、配置全局变量，并在游戏中展示和触发场景跳转。

## 任务分解

### 1. 更新 DSL 规范和类型定义
- [x] 更新 DSL_SPEC.md - 添加变量元数据格式
- [x] 更新 types.ts - 添加 Variable 接口和辅助函数
- [x] 更新 parser/index.ts - 解析和序列化变量元数据

### 2. 前端编辑器
- [x] 创建 EditorVariablesTab.tsx 组件
- [x] 更新 VisualEditor.tsx 集成变量 Tab

### 3. 游戏播放器
- [x] 更新 GamePlayer.tsx - 显示可见变量
- [x] 实现变量触发器逻辑（进入特定场景）
- [x] 更新 evaluator.ts 使用 RuntimeState 类型

### 4. 测试
- [x] 解析器测试 (variables.test.ts)
- [x] 播放器测试（更新已有测试）

## 已完成功能

### 变量数据结构
```yaml
state:
  health:
    value: 100
    visible: true
    display: progress  # value | progress | icon
    max: 100           # 用于进度条
    label: "生命值"
    trigger:
      condition: "<= 0"
      scene: game_over
  gold:
    value: 10
    visible: true
    display: value
  has_key:
    value: false
    visible: false
```

### 展示方式
- **value**: 直接显示数值或文本
- **progress**: 显示进度条（需要 max 值）
- **icon**: 显示图标（用于布尔值或物品）

### 触发器
当变量满足指定条件时，自动跳转到指定场景。例如：
- 生命值 <= 0 时跳转到 game_over 场景
- 声望 == 100 时跳转到 victory 场景
