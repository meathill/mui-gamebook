---
description: 创建高质量的游戏剧本 - 从需求分析到完整剧本生成
---

# 游戏剧本创作 Skill

本工作流用于创作高质量的互动游戏剧本，充分利用 DSL 的强大特性。

## 前置准备

在开始之前，请确保：
1. 已阅读 [DSL_SPEC.md](file:///Users/meathill/Documents/GitHub/mui-gamebook/DSL_SPEC.md)
2. 参考示例剧本：`demo/mortal_cultivation.md`、`demo/little_red_riding_hood.md`

---

## 阶段一：需求分析与故事研究

### 1.1 收集用户需求

向用户询问以下信息：
- **故事来源**：原创 or 改编经典？如果改编，是哪个故事/IP？
- **目标受众**：儿童/青少年/成人？
- **游戏时长**：预计游玩时间（建议 1-3 小时）
- **核心主题**：冒险/悬疑/爱情/教育/其他？
- **互动程度**：轻度（线性为主）/ 中度（多分支）/ 重度（复杂变量系统）
- **特殊需求**：是否需要小游戏、TTS 语音、特定风格等

### 1.2 故事研究（如果是改编）

// turbo
1. 使用 `search_web` 或 `read_url_content` 查找原始故事的完整版本
2. 分析故事结构：起承转合、关键冲突、角色关系
3. 识别可改编为互动选项的关键决策点
4. 记录原始故事中的重要元素（角色、场景、道具、情节）

### 1.3 输出：故事大纲文档

在 `/Users/meathill/.gemini/antigravity/brain/{session_id}/story_outline.md` 中记录：
- 故事概要（3-5 句话）
- 主要角色列表（名称、描述、作用）
- 核心情节线（5-10 个关键节点）
- 分支决策点（至少 5 个重要选择）
- 结局类型（好/坏/隐藏结局）

---

## 阶段二：剧本架构设计

### 2.1 设计游戏状态变量

根据故事需求设计变量系统：

**常用变量类型**：
- 进度标记：`bool` 类型，如 `has_key`, `met_npc`, `found_clue`
- 数值属性：`number` 类型，如 `health`, `gold`, `reputation`
- 触发器变量：带 `trigger` 配置，如血量归零跳转 game_over

**设计原则**：
- 变量数量控制在 5-15 个
- 核心变量设为 `visible: true`，用进度条或数值显示
- 为重要变量配置触发器，增加戏剧性

### 2.2 设计角色系统

为每个主要角色创建 `ai.characters` 定义：

```yaml
ai:
  characters:
    角色ID:
      name: "显示名称"
      description: "角色背景描述"
      image_prompt: "用于 AI 生成图片的详细描述，包含外貌、服装、气质"
      voice_name: "TTS 声音（可选）"
```

**角色描述要点**：
- 年龄、性别、身材
- 服装风格和颜色
- 表情和气质
- 特殊标识（疤痕、配饰等）

### 2.3 设计场景地图

绘制场景流程图：

```
start ──► scene_a ──► scene_b
              │           │
              ▼           ▼
         scene_c    scene_d ──► ending_good
              │
              ▼
         ending_bad
```

**场景设计原则**：
- 每个场景 1-3 个选项
- 避免单选项场景链过长（3 个以内）
- 关键分支点设置条件选项
- 死胡同场景需提供返回/重开选项

### 2.4 输出：剧本骨架

创建初始 Markdown 文件，包含：
- 完整的 YAML Front Matter
- 所有场景 ID 和基本描述
- 选项骨架（不含详细文本）

---

## 阶段三：场景内容创作

### 3.1 场景描述写作

每个场景包含以下元素：

1. **图片生成块**（必须）：
   ```yaml
   ```image-gen
   prompt: 详细的场景描述，包含环境、氛围、角色动作
   character: 角色ID（如有）
   characters: [角色ID1, 角色ID2]（多角色场景）
   ```
   ```

2. **场景叙述**（必须）：
   - 使用第二人称（"你"）
   - 描述环境、气氛、角色状态
   - 长度：50-150 字

3. **音频生成块**（关键场景推荐）：
   ```yaml
   ```audio-gen
   type: background_music | sfx
   prompt: 音乐风格描述
   ```
   ```

4. **选项列表**（必须，除结局场景）

### 3.2 图片 Prompt 写作技巧

**好的 Prompt 结构**：
`[主体] + [动作/姿态] + [环境] + [氛围/光线] + [风格标记]`

**示例**：
```
A young knight in silver armor standing before a dark castle gate,
moonlight casting long shadows, dramatic lighting, epic fantasy style
```

**避免**：
- 过于简单："一个人站在那里"
- 混入文字内容："写着'危险'的牌子"
- 负面描述："不要有太阳"

### 3.3 变量插值使用

在文本中使用 `{{变量名}}` 显示当前值：

```markdown
你现在有 {{gold}} 金币，生命值为 {{health}}。
```

### 3.4 条件与状态修改

**条件选项**：
```markdown
* [打开宝箱] -> treasure_room (if: has_key == true)
* [继续探索] -> explore_more
```

**状态修改**：
```markdown
* [购买药水] -> shop (set: gold = gold - 10, has_potion = true)
```

---

## 阶段四：增强互动性

### 4.1 添加小游戏

在适当位置插入小游戏增强体验：

```yaml
```minigame-gen
prompt: 详细描述游戏玩法和规则
variables:
  - score: 玩家得分
```
```

**适合场景**：
- 战斗/对决
- 解谜/探索
- 限时挑战
- 收集任务

**配合条件选项实现分支**：
```markdown
* [查看结果] -> success_scene (if: score >= 10)
* [查看结果] -> fail_scene (if: score < 10)
```

### 4.2 添加 TTS 语音（儿童向推荐）

为文本添加语音：
```markdown
这是场景描述文本。
<!-- audio: URL -->
```

为选项添加语音：
```markdown
* [选项文本] -> next (audio: URL)
```

### 4.3 多结局设计

设计 3-5 个不同结局：
- **好结局**：完成主线，达成目标
- **坏结局**：关键失误，任务失败
- **隐藏结局**：特殊条件触发
- **开放结局**：留有悬念

---

## 阶段五：质量检查

### 5.1 结构检查

- [ ] 必须有 `# start` 场景
- [ ] 所有场景 ID 唯一且有效
- [ ] 选项的目标场景都存在
- [ ] 无孤立场景（无法到达）
- [ ] 结局场景无悬空选项

### 5.2 变量一致性

- [ ] 所有 `(if:)` 中引用的变量都在 `state` 中定义
- [ ] 所有 `(set:)` 中修改的变量都在 `state` 中定义
- [ ] 触发器条件合理（如 health <= 0）

### 5.3 内容质量

- [ ] 每个场景都有 `image-gen` 块
- [ ] 关键场景有背景音乐
- [ ] 文字描述清晰，无错别字
- [ ] 选项文字简洁有吸引力

### 5.4 游戏体验

- [ ] 分支有意义（选择影响后续内容）
- [ ] 节奏合理（紧张与舒缓交替）
- [ ] 游玩时长符合预期
- [ ] 变量系统增加可玩性

---

## 输出文件格式

最终剧本保存为 `.md` 文件，结构：

```markdown
---
title: "游戏标题"
description: "简短描述"
backgroundStory: |
  详细背景故事...
cover_prompt: "封面图生成提示词"
tags: [标签1, 标签2]
published: false
state:
  变量定义...
ai:
  style:
    image: "图片风格"
    audio: "音频风格"
  characters:
    角色定义...
---

# start
```image-gen
prompt: 开场场景描述
```

开场叙述文本...

* [选项1] -> scene_a
* [选项2] -> scene_b

---

# scene_a
...
```

---

## 时长与规模参考

| 游玩时长 | 场景数量 | 分支数量 | 变量数量 |
|---------|---------|---------|---------|
| 30 分钟 | 10-15   | 3-5     | 3-5     |
| 1 小时  | 20-30   | 5-10    | 5-8     |
| 2 小时  | 40-60   | 10-20   | 8-15    |
| 3 小时  | 60-100  | 20-30   | 10-20   |

---

## 常见问题

**Q: 如何处理复杂的条件逻辑？**
A: 使用多个变量组合，在条件选项中用逗号分隔多个条件

**Q: 如何避免剧本太线性？**
A: 在关键节点设置至少 2-3 个真正影响后续的选择

**Q: 小游戏不工作怎么办？**
A: 小游戏需要单独生成 JS 文件，确保 `url` 字段指向有效链接

**Q: 如何让角色形象一致？**
A: 在 `ai.characters` 中详细定义角色，并在 `image-gen` 中引用

---

## 阶段六：图片生成

完成剧本文本后，为每个场景生成配图。

### 6.1 提取图片 Prompt

// turbo
1. 遍历剧本中所有 `image-gen` 块
2. 提取 `prompt` 字段内容
3. 如果有 `character` 或 `characters` 引用，合并 `ai.characters` 中的 `image_prompt`

### 6.2 生成图片

对每个 `image-gen` 块使用 `generate_image` 工具：

// turbo
```
generate_image({
  Prompt: "合并后的完整 prompt + ai.style.image 风格描述",
  ImageName: "scene_id_场景名"
})
```

**生成顺序**：
1. 封面图（如有 `cover_prompt`）
2. `start` 场景
3. 其他场景

### 6.3 记录本地路径

生成后记录每张图片的本地路径（artifacts 目录），用于后续上传：

```
{
  "scene_id": "/path/to/image.webp",
  ...
}
```

---

## 阶段七：上传与提交

将剧本和图片提交到服务器，形成完整游戏。

### 7.1 上传图片到 R2

使用 `run_command` 调用 curl 将图片上传：

```bash
# 读取图片并转为 base64
base64 -i /path/to/image.webp | tr -d '\n' > /tmp/img.b64

# 上传
curl -X POST https://your-domain/api/agent/assets/upload \
  -H "Authorization: Bearer $ADMIN_PASSWORD" \
  -H "Content-Type: application/json" \
  -d '{
    "gameSlug": "game-slug",
    "fileName": "scene_id.webp",
    "base64": "'$(cat /tmp/img.b64)'",
    "contentType": "image/webp"
  }'
```

返回的 `url` 填入对应 `image-gen` 块的 `url` 字段。

### 7.2 创建游戏

// turbo
```bash
curl -X POST https://your-domain/api/agent/games \
  -H "Authorization: Bearer $ADMIN_PASSWORD" \
  -H "Content-Type: application/json" \
  -d '{"title": "游戏标题", "content": "完整剧本内容"}'
```

### 7.3 验证结果

1. 检查返回的 `id` 和 `slug`
2. 提供游戏预览链接给用户

---

## 环境变量

执行阶段七需要以下环境变量：

- `ADMIN_PASSWORD`: Admin 认证密钥
- `API_URL`: API 基础地址（如 `https://gamebook.example.com`）

