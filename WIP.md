# WIP: 全局 AI Chatbot 功能

## 当前状态：✅ 功能完成

### 已实现功能

1. **Chat API** (`/api/cms/games/[id]/chat`)
   - SSE 流式响应
   - 12 个 function declarations
   - 用量记录

2. **ChatPanel 组件**
   - 消息列表和输入框
   - SSE 流解析
   - function call 回调

3. **Function Call 处理器** (`chatFunctionHandlers.ts`)
   - 场景：updateScene, addScene, deleteScene, renameScene
   - 选项：addChoice, updateChoice, deleteChoice
   - 变量：addVariable, updateVariable, deleteVariable
   - 角色：addCharacter, updateCharacter, deleteCharacter

4. **编辑器集成**
   - EditorToolbar AI 助手按钮
   - VisualEditor 中 3 个 tab 集成 ChatPanel

## 测试方法

```bash
cd packages/app && pnpm dev
```

1. 访问 http://localhost:3020/admin/edit/[id]
2. 切换到 Story tab
3. 点击 "AI 助手" 按钮
4. 输入 "把 start 场景的描述改成：这是一个测试故事"
5. 观察 console 和编辑器是否正确更新
