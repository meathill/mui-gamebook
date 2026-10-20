# WIP

当前无正在进行的短期任务。本轮完成编辑器 chatbot 工具闭环强化：WebMCP 新增 `getScene`/`searchScenes`/`validateScript` 只读工具，`getDsl` 返回完整 DSL；编辑器执行链路改为工作副本 + 单次提交 + 整批校验回滚，补齐 `setSceneImage`/`updateCharacter.imageUrl`；chatbot 支持最多 4 轮工具调用（Provider 侧支持 tool 消息），工具结果会回传模型继续纠错；story/flowchart 双源同步与 in-page WebMCP 显式工具列表已对齐。全量 2168 个测试、类型检查、格式化、构建均通过。
