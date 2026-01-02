# MUI Gamebook Asset Generator

批量生成游戏素材（图片、TTS 语音、小游戏等）的命令行工具。

## 命令列表

| 命令 | 说明 |
|------|------|
| `pnpm enhance` | AI 补全缺失的图片 prompts |
| `pnpm check` | 检查剧本图片生成完整性 |
| `pnpm upload` | 上传增强后的剧本到服务器 |
| `pnpm batch` | 批量生成图片/TTS/小游戏 |

## 完整工作流程

```bash
# 1. AI 补全 prompts（保存到 output/）
pnpm enhance --config configs/my-game.json

# 2. 检查生成结果
pnpm check ./output/my-game-enhanced.md

# 3. 确认后上传到服务器
pnpm upload --config configs/my-game.json

# 4. 批量生成图片
pnpm batch --config configs/my-game.json
```

## 命令详情

### enhance - AI 补全 prompts

```bash
pnpm enhance --config <配置文件路径>
```

从 API 获取剧本，使用 AI 为缺少图片的场景自动生成 `ai_image` 节点和 prompt，保存到 `./output/<gameSlug>-enhanced.md`。

### check - 检查图片完整性

```bash
pnpm check <剧本文件路径>
```

检查剧本中所有 `ai_image` 节点是否都有 URL。

### upload - 上传剧本

```bash
pnpm upload --config <配置文件路径>
```

将 `./output/<gameSlug>-enhanced.md` 上传到服务器。

### batch - 批量生成

```bash
pnpm batch --config <配置文件路径> [--force] [--dry-run]
```

**选项：**
- `--force` - 强制重新生成所有素材
- `--dry-run` - 只生成和上传，不更新数据库

## 配置文件格式

```json
{
  "apiUrl": "https://your-domain.com",
  "adminSecret": "your-admin-secret",
  "gameSlug": "your-game-slug",
  "providerType": "openai",
  "force": false,
  "tts": {
    "sceneText": true,
    "choices": true
  }
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `apiUrl` | string | ✅ | API 基础 URL |
| `adminSecret` | string | ✅ | 管理员密钥 |
| `gameSlug` | string | ✅ | 游戏 slug |
| `providerType` | `"google"` \| `"openai"` | ❌ | AI 提供商 |
| `force` | boolean | ❌ | 强制重新生成 |
| `tts` | object | ❌ | TTS 配置（不配置则不生成） |

## 本地缓存

脚本使用本地缓存避免重复生成和重复上传：

- 缓存目录：`cache/<gameSlug>/`
- 上传记录：`cache/<gameSlug>/.uploaded.json`

**清除缓存：**
```bash
rm -rf cache/<gameSlug>
```

## 环境变量

参见 `.env.example` 文件。
