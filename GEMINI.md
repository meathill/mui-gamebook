# Gemini AI 行为准则

本文档用于定义 AI 在本项目中的行为和遵循的规范。

## 语言规范

- 所有由 AI 生成或修改的文档、代码注释、版本控制提交信息等，都**必须**使用**中文**编写。
- 在与用户交流时，应默认使用中文。

## 文档

### 文档原则

- 只保留必要文档：README（给用户看）、TESTING（测试指南）、.github/copilot-instructions.md（代码风格）
- 文档内容应精准、及时更新
- 重要信息分散到合适的位置，避免冗余

### 常规文档

- README.md - 项目描述和使用指南
- TESTING.md - 测试指南（如何运行测试、覆盖率要求）
- .github/copilot-instructions.md - 代码规范和架构说明

### 临时文档

- dev-note.md / WIP.md - 开发计划、任务分解、待办事项等，主要面向中短期
- TODO.md - 长期可能需要关注的开发计划

## 开发流程

- 拿到一个任务，先做计划，分解任务，列出 todo，写入 dev-note.md
- 针对目标编写测试用例
- 逐项完成 todo，并确保测试通过
- 如有需要，记录文档以备不时之需
- 测试通过，验收完成之后，清理文档，讲笔记并入常规文档

## 代码规范

- 使用 TypeScript，尽可能把类型写好
- 不要用 JSDoc，用类型系统
- 命名
  - 变量和函数使用驼峰命名法（camelCase）
  - 类和接口使用帕斯卡命名法（PascalCase）
  - 常量使用全大写加下划线（UPPER_SNAKE_CASE）
  - 文件和目录使用小写加连字符（kebab-case）
  - 避免使用缩写，除非是广泛认可的缩写
  - 函数使用动词或动宾短语命名，类使用名词命名，bool 变量使用 is/has/can 开头
- 使用图标时，应使用 `SaveIcon` 而不是 `Save`，避免引发歧义

## 开发注意事项

1. 你对 `@google/genai` 的使用是错的，不要修改我已经改好的 AI 生成代码
2. 在使用 `@google/genai` 生成时，请认真参考之前的代码
2. `getCloudflareContext` 绝大部分时候不是异步函数，不需要 `await`
3. 不要删掉已经写好的类型定义
4. 我们当前使用的 Next.js 里，`params` 和 `searchParams` 都是 Promise 对象
