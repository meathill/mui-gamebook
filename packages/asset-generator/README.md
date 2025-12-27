# MUI Gamebook Asset Generator

批量生成游戏素材（图片、TTS 语音、小游戏等）的命令行工具。

## 用法

```bash
pnpm batch --config <配置文件路径> [--force] [--dry-run]
```

### 选项

- `--force` - 强制重新生成所有素材（忽略已有 URL）
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
  },
  "format": {
    "audio": "mp3",
    "image": "webp"
  }
}
```

### 配置项说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `apiUrl` | string | ✅ | API 基础 URL |
| `adminSecret` | string | ✅ | 管理员密钥 |
| `gameSlug` | string | ✅ | 游戏 slug |
| `providerType` | `"google"` \| `"openai"` | ❌ | AI 提供商，默认从环境变量读取 |
| `force` | boolean | ❌ | 强制重新生成 |
| `tts` | object | ❌ | TTS 配置（不配置则不生成 TTS） |
| `tts.sceneText` | boolean | ❌ | 为场景文本生成语音 |
| `tts.choices` | boolean | ❌ | 为选项生成语音 |
| `format.audio` | `"mp3"` \| `"wav"` | ❌ | 音频格式 |
| `format.image` | `"webp"` \| `"png"` | ❌ | 图片格式 |

### 自动生成规则

脚本会**自动生成**以下类型素材（如果有对应 prompt 且无 URL）：

- 角色头像（`ai.characters.*.image_prompt`）
- 封面图（`cover_image` 以 `prompt:` 开头）
- 场景图片（`ai_image` 节点）
- 小游戏（`minigame` 节点）

以下类型**需要显式配置**才会生成：

- TTS 语音（需配置 `tts.sceneText` 或 `tts.choices`）

## 环境变量

参见 `.env.example` 文件。

## 本地缓存

脚本使用本地缓存避免重复生成和重复上传：

- 缓存目录：`cache/<gameSlug>/`
- 缓存 key：基于内容哈希（相同内容 = 相同缓存）
- 上传记录：`cache/<gameSlug>/.uploaded.json`
- 支持的资源：图片、TTS、小游戏

**工作流程：**
1. 检查上传记录 → 已上传则直接返回 URL
2. 检查本地缓存 → 有缓存则读取
3. 无缓存 → 调用 AI 生成 → 保存到缓存
4. 上传到 R2 → 记录 URL

**好处：**
- 进程中断后重新运行，已生成的资源不会再次调用 AI
- 已上传的文件不会重复上传
- 节省 API 调用成本和上传时间

**清除缓存：**
```bash
rm -rf cache/<gameSlug>
```

## 示例

```bash
# 只生成图片和小游戏（不生成 TTS）
pnpm batch --config ./configs/my-game.json

# 生成所有素材包括 TTS（需在配置中设置 tts 选项）
pnpm batch --config ./configs/my-game-with-tts.json

# 强制重新生成（忽略缓存）
pnpm batch --config ./configs/my-game.json --force

# 测试模式
pnpm batch --config ./configs/my-game.json --dry-run
```
