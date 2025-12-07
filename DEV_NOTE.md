开发笔记
====

## 异步操作系统

视频生成等耗时较长的操作使用异步处理模式：

1. **发起请求**：用户发起视频生成请求，系统返回一个占位符 URL（格式：`pending://123`）
2. **操作记录**：在 `PendingOperations` 表中存储操作信息，包括 Google API 的 operation name
3. **前端轮询**：Inspector 组件每 10 秒检查一次占位符状态
4. **完成处理**：当检测到操作完成时，下载视频并上传到 R2，更新数据库，替换占位符为最终 URL

相关文件：
- `/packages/app/migrations/0004_pending_operations.sql` - 数据库迁移
- `/packages/app/src/lib/pending-operations.ts` - 操作管理服务
- `/packages/app/src/app/api/cms/assets/generate-async/route.ts` - 异步生成 API
- `/packages/app/src/app/api/cms/operations/route.ts` - 状态查询 API
- `/packages/app/src/hooks/useAsyncOperation.ts` - 前端轮询 Hook

## 数据隔离

游戏发布后，玩家看到的数据会经过过滤处理（`toPlayableGame` 函数），以下信息不会暴露给玩家：

- 角色的 AI 相关设置（`description`、`image_prompt`）
- 场景中 AI 生成资源的提示词（`prompt`）
- AI 风格配置（`ai.style`）

玩家可见的信息：
- 基本元数据（标题、描述、封面、标签）
- 场景内容和选项
- 角色名称和已生成的头像 URL
- 已生成的媒体资源 URL
