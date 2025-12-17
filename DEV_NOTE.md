开发笔记
====

## 独立站点认证架构

独立站点（如 `sites/jianjian`）不直接处理用户认证，而是通过 API 代理将认证请求转发到 CMS（`packages/app`）：

1. **认证流程**：
   - 用户在独立站点访问 `/sign-in` 页面
   - 使用 better-auth 客户端发起登录请求到 `/api/auth/*`
   - 独立站点的 API 代理 (`/api/auth/[...path]/route.ts`) 将请求转发到 CMS
   - CMS 处理认证并设置 Cookie
   - API 代理保留所有响应头（包括 Set-Cookie）返回给客户端

2. **配置要点**：
   - 使用 `NEXT_PUBLIC_API_URL` 环境变量配置 CMS 地址
   - 共享配置统一在 `src/lib/config.ts` 管理
   - Cookie 跨域配置通过 CMS 的 `COOKIE_DOMAIN` 环境变量控制

3. **相关文件**：
   - `/sites/jianjian/src/lib/config.ts` - 共享配置
   - `/sites/jianjian/src/lib/auth-client.ts` - better-auth 客户端配置
   - `/sites/jianjian/src/app/sign-in/page.tsx` - 登录页面
   - `/sites/jianjian/src/app/api/auth/[...path]/route.ts` - 认证 API 代理
   - `/packages/app/src/lib/auth-config.ts` - CMS 认证配置

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
- 小游戏的生成 prompt 和变量描述

玩家可见的信息：
- 基本元数据（标题、描述、封面、标签）
- 场景内容和选项
- 角色名称和已生成的头像 URL
- 已生成的媒体资源 URL
- 小游戏的 URL 和变量名列表（不含描述）

## 小游戏系统

平台支持在场景中嵌入 AI 生成的小游戏：

1. **生成流程**：作者输入 prompt 描述小游戏规则，AI 生成 JavaScript 代码
2. **存储方式**：生成的代码存储在 `MiniGames` 表中，通过 API 提供
3. **变量交互**：小游戏可以读取和修改指定的游戏变量
4. **场景跳转**：通过选项的条件判断实现根据小游戏结果跳转

相关文件：
- `/packages/app/migrations/0005_mini_games.sql` - 数据库迁移
- `/packages/app/src/app/api/cms/minigames/` - 小游戏 API
- `/packages/app/src/components/game-player/MiniGamePlayer.tsx` - 小游戏播放器
- `/packages/core/lib/ai.ts` - `generateMiniGame` 函数
- `/packages/parser/tests/minigame.test.ts` - DSL 解析测试

### 小游戏 API 规范

```typescript
interface MiniGameAPI {
  init(container: HTMLElement, variables: Record<string, number | string | boolean>): void;
  onComplete(callback: (variables: Record<string, number | string | boolean>) => void): void;
  destroy(): void;
}
```

### 支持的小游戏类型

- 点击类：点击目标、打地鼠
- 记忆类：翻牌配对、记忆序列
- 反应类：快速反应测试
- 收集类：限时收集物品
