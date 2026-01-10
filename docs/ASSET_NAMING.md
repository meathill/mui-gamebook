# 游戏资源命名规范

本文档定义了上传脚本 (`scripts/upload-game-assets.ts`) 识别和匹配游戏资源的命名规则。

## 目录结构

```
demo/${slug}/
├── ${slug}.md           # 游戏剧本
└── assets/
    ├── cover.webp       # 封面图
    ├── ${char}_portrait.webp   # 角色立绘
    ├── scene_${scene_id}.webp  # 场景图
    ├── ${slug}_${scene_id}_minigame.js  # 小游戏代码
    └── mapping.json     # 可选：自定义映射
```

## 命名规则

### 1. 封面图 (Cover)
- **模式**: 文件名包含 `cover`
- **示例**: `cover.webp`, `game_cover.png`, `cover_1234567890.webp`
- **匹配逻辑**: `basename.includes('cover')`

### 2. 角色立绘 (Portraits)
- **模式**: `{角色ID}_portrait`
- **示例**: `harry_portrait.webp`, `marcus_portrait_1234567890.png`
- **匹配逻辑**: 正则 `/^(.+)_portrait/` 提取角色 ID
- **映射目标**: `ai.characters.{角色ID}.image_url`

### 3. 场景图 (Scene Images)
- **模式**: `scene_{场景ID}` 或 `{slug}_{场景ID}`
- **示例**:
  - `scene_start.webp` → 匹配场景 `# start`
  - `bible-journey_moses_1_1234567890.webp` → 匹配场景 `# moses_1`
- **匹配逻辑**:
  1. 去除尾部时间戳 (`_\d{10,14}$`)
  2. 去除游戏前缀 (`${slug}_`)
  3. 尝试匹配 `scene_${id}` 或直接 `${id}`
- **映射目标**: `image-gen` 块的 `url` 字段

### 4. 小游戏代码 (Minigames)
- **模式**: `{slug}_{场景ID}_minigame.js`
- **示例**: `harry-potter_de_gnoming_game_minigame.js`
- **匹配逻辑**: 提取 `{场景ID}_minigame` 作为键
- **映射目标**: `minigame-gen` 块的 `url` 字段

## 自定义映射 (mapping.json)

当资源文件名无法自动匹配场景 ID 时，创建 `mapping.json`:

```json
{
  "资源键": "场景ID",
  "start_minigame": "personality_test_minigame"
}
```

**规则**:
- 左侧：资源文件名提取的键（去除 slug 前缀和时间戳后缀）
- 右侧：Markdown 中对应的 scene ID（小游戏需加 `_minigame` 后缀）

## 重复上传防护

脚本会检查 Markdown 中已存在的 `url` 字段：
- 如果某个 `image-gen` 或 `minigame-gen` 的 `url` 已是 `http://` 或 `https://` 开头，则跳过上传
- 这确保多次运行脚本不会重复上传已有资源

## 上传失败重试

- 默认重试 3 次
- 采用指数退避策略（1s, 2s, 3s）
- 所有重试失败后记录错误但继续处理其他资源
