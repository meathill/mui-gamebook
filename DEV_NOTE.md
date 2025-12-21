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

## API 数据格式规范

### CMS 公开 API

CMS 对外提供的 API 遵循以下格式：

| 端点 | 响应格式 |
|------|---------|
| `GET /api/games` | `Game[]` (直接数组) |
| `GET /api/games/:slug` | `Game` (单个对象) |
| `GET /api/games/:slug/play` | `PlayableGame` (单个对象) |

### 子站点调用 API

子站点（如 `sites/jianjian`）通过 HTTP 调用 CMS API 获取数据。调用时注意：

1. **响应格式**：API 直接返回数组或对象，不包裹在 `{ data: ... }` 或类似结构中
2. **错误处理**：需捕获网络错误和 HTTP 错误，返回合理的默认值
3. **缓存策略**：使用 Next.js 的 `revalidate` 配置控制缓存时间

相关文件：
- `/sites/jianjian/src/lib/api.ts` - API 调用封装
- `/sites/jianjian/src/lib/api.test.ts` - API 测试

## AI 上下文自动合并

在编辑器中生成 AI 资源（图片、音频、视频）时，系统会自动将 `ai.style` 和 `ai.characters` 合并到用户 prompt 中：

1. **图片/视频生成**：自动添加 `ai.style.image` + 引用角色的 `image_prompt`
2. **音频生成**：自动添加 `ai.style.audio`

相关文件：
- `/packages/app/src/lib/ai-prompt-builder.ts` - prompt 组装工具
- `/packages/app/tests/lib/ai-prompt-builder.test.ts` - 单元测试

## TTS 语音生成

平台支持为场景文本和选项生成语音：

1. **场景语音**：在 Inspector 中点击"生成语音"按钮
2. **选项语音**：为每个选项单独生成语音

技术实现：
- 使用 Gemini TTS 模型 (`gemini-2.5-flash-preview-tts`)
- 默认使用 Aoede 温和女声
- 音频存储在 R2，格式为 WAV

相关文件：
- `/packages/app/src/lib/ai-service.ts` - `generateAndUploadTTS` 函数
- `/packages/app/src/app/api/cms/assets/generate-tts/route.ts` - TTS API

## 管理员 API

提供管理员级别的 API，用于批量操作剧本：

| 端点 | 方法 | 功能 |
|-----|------|------|
| `/api/admin/games/[slug]` | GET | 获取剧本 Markdown 内容 |
| `/api/admin/games/[slug]` | PUT | 更新剧本内容 |

认证方式：`Authorization: Bearer ADMIN_PASSWORD`

相关文件：
- `/packages/app/src/app/api/admin/games/[slug]/route.ts`

## 批量生成工具

`packages/asset-generator` 提供批量生成脚本，用于为剧本批量生成 TTS 语音等资源：

**使用方式：**
```bash
cd packages/asset-generator
pnpm batch --config ./configs/your-config.json [--force]
```

**命令行选项：**
| 选项 | 说明 |
|-----|------|
| `--config` | 配置文件路径（必需） |
| `--force` | 强制重新生成所有素材（忽略已有 URL） |
| `--dry-run` | 只生成和上传，不更新数据库（测试用） |

**配置文件格式：**
```json
{
  "apiUrl": "https://cms.example.com",
  "adminSecret": "xxx",
  "gameSlug": "my-story",
  "generate": {
    "sceneTTS": true,
    "choiceTTS": true
  },
  "format": {
    "audio": "mp3"
  }
}
```

**功能特性：**
- **本地缓存**：生成的素材保存到 `cache/` 目录，避免重复生成
- **跳过已生成**：剧本中已有 URL 的素材跳过
- **格式转换**：远端素材格式不符时自动下载、转换、重新上传
- 支持 WAV 转 MP3（需要系统安装 ffmpeg）
- 使用 `ai.style.tts` 配置语音风格

相关文件：
- `/packages/asset-generator/src/batch-generate.ts` - 批量生成入口
- `/packages/asset-generator/src/lib/cache.ts` - 本地缓存
- `/packages/asset-generator/src/lib/converter.ts` - 格式转换
- `/packages/asset-generator/configs/example.json` - 配置示例
