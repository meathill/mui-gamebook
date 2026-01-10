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
      description: "角色的描述，用于叙事和对话"
      image_prompt: "用于 AI 生成图片的详细描述，包含外貌、服装、气质"
      image_url: "角色立绘 URL（上传后填入）"
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

### 2.5 ⚠️ 场景数量校验（重要检查点）

在完成剧本骨架后，**必须校验场景数量是否符合目标时长**：

| 目标时长 | 最少场景数 | 推荐场景数 |
|---------|----------|----------|
| 30 分钟 | 15       | 20-25    |
| 1 小时  | 30       | 35-45    |
| 1.5 小时 | 45       | 50-60    |
| 2 小时  | 60       | 70-80    |

**校验方法**：
```bash
grep -c '^# ' demo/${slug}/${script}.md
```

如果场景数量不足，需要返回扩展剧本：
- 增加支线任务和探索场景
- 拆分复杂场景为多个步骤
- 添加更多分支选择点

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

在适当位置插入小游戏增强体验。

**⚠️ 关键格式要求（避免 YAML 解析失败）**：

```yaml
```minigame-gen
prompt: '单行描述游戏玩法和规则，用单引号包裹避免特殊字符问题'
variables:
  score: 玩家得分
  time_left: 剩余时间
url: https://...minigame.js
```
```

**✅ 正确格式要点**：
- `prompt:` 使用单引号包裹的单行文本，避免使用 `|` 多行语法中的 `-` 开头行
- `variables:` 使用对象格式（`key: value`），**不要使用列表格式**（`- key: value`）
- `url:` 在小游戏 JS 上传后填写

**❌ 常见错误格式**：
```yaml
# 错误1：variables 使用列表格式
variables:
  - score: 玩家得分  # ← 不要有这个 -

# 错误2：prompt 多行中使用 - 开头
prompt: |
  这是游戏说明
  - 操作方法  # ← - 会被解析为 YAML 列表
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

### 5.3 ⚠️ YAML 格式检查（关键！避免返工）

在填充完剧本内容后，**必须逐项检查以下格式要求**，避免解析失败：

- [ ] **minigame-gen 块**：
  - [ ] `prompt:` 使用单引号包裹的单行文本
  - [ ] `variables:` 使用对象格式（`key: value`），**不要有 `-` 前缀**
  - [ ] 已添加 `url:` 字段
- [ ] **image-gen 块**：
  - [ ] `prompt:` 中没有未转义的双引号 `"`
  - [ ] `prompt:` 中冒号后没有空格（`text: more` → `text - more`）
  - [ ] 已添加 `url:` 字段
- [ ] **所有 YAML 块**：
  - [ ] 没有以 `-` 开头的内容行（除非是真正的列表）
  - [ ] 没有以 `>` 或 `|` 开头的意外行
  - [ ] 没有未闭合的引号

**常见问题快速修复表**：

| 问题 | 错误写法 | 正确写法 |
|------|---------|---------|
| 列表式 variables | `- score: 得分` | `score: 得分` |
| 多行 prompt 中有列表 | `prompt: \|` + `- 操作方法` | `prompt: '操作方法...'` |
| prompt 中有引号 | `prompt: say "hello"` | `prompt: 'say "hello"'` |
| prompt 中有冒号 | `prompt: 提示：继续` | `prompt: '提示：继续'` |

### 5.4 内容质量

- [ ] 每个场景都有 `image-gen` 块
- [ ] 关键场景有背景音乐
- [ ] 文字描述清晰，无错别字
- [ ] 选项文字简洁有吸引力

### 5.4 游戏体验

- [ ] 分支有意义（选择影响后续内容）
- [ ] 节奏合理（紧张与舒缓交替）
- [ ] 游玩时长符合预期
- [ ] 变量系统增加可玩性

### 5.5 自动化验证（必须执行）

使用验证脚本检查剧本语法和结构：

// turbo
```bash
pnpx tsx scripts/validate-game-script.ts demo/${slug}/${script}.md
```

**验证内容：**
- YAML 语法正确性（检测特殊字符、引号问题）
- 场景引用完整性（无未定义的场景引用）
- 孤立场景检测
- 场景数量统计

**YAML 特殊字符转义：**

当 prompt 值包含特殊字符时，使用**单引号或双引号**包裹整个值：

```yaml
# ❌ 错误：特殊字符未转义
prompt: Writing on the wall: "DANGER" ahead

# ✅ 正确：用单引号包裹
prompt: 'Writing on the wall: "DANGER" ahead'

# ✅ 正确：用双引号包裹（内部双引号需转义）
prompt: "Writing on the wall: \"DANGER\" ahead"

# ✅ 正确：使用多行语法
prompt: |
  Writing on the wall: "DANGER" ahead
  Attack > Defense > Counter > Attack
```

**需要转义的特殊字符：**
- `:` 冒号（后跟空格时）
- `"` 双引号
- `>` 和 `|` 开头的行
- `#` 井号（会被解析为注释）
- `[` `]` `{` `}` 数组/对象语法

---

## 阶段六：资源生成与整理

### 6.1 生成游戏 Slug

1. 根据游戏标题生成 slug（如 `harry-potter`）
2. 创建资源目录：`/Users/meathill/Documents/GitHub/mui-gamebook/demo/${slug}`

### 6.2 生成封面图

封面图是游戏在列表中展示的主图，**必须生成**。

1. 根据剧本中的 `cover_prompt` 生成封面图
2. 命名为 `cover.png` 或 `cover.webp`
3. 保存到 `demo/${slug}/assets/` 目录
4. 在剧本 YAML 中添加 `cover` 字段指向上传后的 URL

**封面图 Prompt 要求**：
- 体现游戏核心主题和氛围
- 避免复杂文字
- 推荐尺寸：1024x1024

**生成示例**：
```
generate_image({
  Prompt: "Harry Potter casting silver stag Patronus against Dementors, dramatic magical scene, epic fantasy",
  ImageName: "cover"
})
```

**在剧本 YAML 中配置**：
```yaml
cover_prompt: "封面图生成提示词"
cover: "https://.../cover.webp"  # 上传后自动填入
```

### 6.3 生成小游戏（完整代码）

小游戏必须是**完整可运行的 JS 代码**，不是占位符。

1. 遍历剧本中所有 `minigame-gen` 块，根据 prompt 生成完整的小游戏逻辑
2. 使用 `write_to_file` 在 `demo/${slug}/assets/` 目录下创建 JS 文件
3. **关键命名规则**：文件名必须为 `${slug}_${scene_id}_minigame.js`（例如 `harry-potter-2_de_gnoming_game_minigame.js`）
4. **每个小游戏必须包含**：
   - 完整的游戏初始化逻辑
   - 用户交互处理（点击、拖拽等）
   - 游戏结束判定和回调
   - 清理函数
5. 确保 JS 文件导出符合 DSL 规范的接口：
   ```javascript
   export default {
     // ⚠️ 关键：callbacks 必须在模块级别初始化，不能在 init 内初始化
     // 因为 onComplete 会在 init 之前被调用
     callbacks: [],

     init(container, variables) {
       // 游戏初始化逻辑
       this.container = container;
       this.variables = { ...variables };
       // ... 其他初始化代码
     },

     onComplete(callback) {
       this.callbacks.push(callback);
     },

     destroy() {
       // 清理资源
     }
   };
   ```
5. `url` 字段暂时留空或填入本地占位符，上传脚本会自动填充。

> **注意**：每个小游戏对应剧本中的一个 `minigame-gen` 块，上传脚本会自动将 JS 代码内容插入到数据库的 Minigames 表。

### 6.4 生成角色立绘（保持一致性的关键）

**先于场景图片生成角色立绘！** 这是保持角色一致性的关键步骤。

1. 为每个主要角色生成独立的立绘
2. 命名规则：`${character_name}_portrait_${timestamp}.png`
3. 转换为 WebP 并保存到 assets 目录

**生成示例**：
```
generate_image({
  Prompt: "${character description} 详细的人物立绘，上半身，正面，白色背景，清晰细节",
  ImageName: "harry_potter_portrait"
})
```

**立绘生成后，在剧本 YAML 中添加 image_url 引用**：
```yaml
ai:
  characters:
    harry:
      name: "Harry Potter"
      description: "哈利·波特，一个勇敢的男孩，额头上有闪电形伤疤"
      image_prompt: "12 year old boy, messy black hair, round glasses, lightning scar on forehead, Gryffindor robes"
      image_url: "https://...harry_potter_portrait.webp"  # 上传后填入
```

> ⚠️ **重要**：上传脚本目前不会自动更新角色 `image_url`，需要手动填写或在生成立绘时直接写入。

### 6.5 生成场景图片

完成剧本文本后，为每个场景生成配图。

> ⚠️ **配额限制警告**：Gemini 图片生成 API 有配额限制（通常每5小时约25-30张）。
> 对于场景数较多的游戏（如60+场景），需要分批次生成，每批约5张。
> 如果遇到 `RESOURCE_EXHAUSTED` 错误，需等待配额重置后继续。

**6.5.1 提取图片 Prompt**
// turbo
1. 遍历剧本中所有 `image-gen` 块
2. 提取 `prompt` 字段内容

**6.5.2 批量生成策略**

对于大型游戏（30+场景），建议：
1. 先生成角色立绘和封面图（最重要）
2. 按剧情顺序分批生成场景图（每批5张）
3. 使用以下命令检查已生成数量：
   ```bash
   ls demo/${slug}/assets/scene_*.webp | wc -l
   ```
4. 记录未生成的场景，配额重置后继续

**6.5.3 生成图片（使用立绘作为参考）**

**重要**：在生成场景图时，将相关角色的立绘作为参考图传入，以保持角色外观一致性。

// turbo
```
generate_image({
  Prompt: "...",
  ImageName: "scene_${scene_id}",  // 推荐用 scene_前缀+场景ID，方便自动匹配
  ImagePaths: ["/path/to/harry_portrait.png", "/path/to/ron_portrait.png"]  // 传入相关角色立绘
})
```

> **命名规范**：推荐使用 `scene_${scene_id}` 格式（如 `scene_start`、`scene_hogwarts_express`），
> 上传脚本会自动去除 `scene_` 前缀和时间戳后缀进行匹配。

**6.5.4 转换为 WebP 格式**

生成的图片默认为 PNG 格式，体积较大。使用 `cwebp` 工具批量转换为 WebP 格式以减小文件体积（约 75% 压缩率）：

// turbo
```bash
cd demo/${slug}/assets && for f in *.png; do cwebp -q 85 "$f" -o "${f%.png}.webp" && rm "$f"; done
```

**6.3.4 保存图片**
将生成的 artifact 图片移动到资源目录 `demo/${slug}/assets/`。

### 6.6 创建资源映射配置（可选）

如果资源文件名与场景 ID 不一致（例如使用 `scene_01_bedroom` 命名但场景 ID 是 `start`），需要创建 `mapping.json` 配置文件：

```json
// demo/${slug}/assets/mapping.json
{
  "scene_01_bedroom": "start",
  "scene_02_dobby_warning": "dobby_warning",
  "de_gnoming_game_minigame": "de_gnoming_game"
}
```

**映射规则说明：**
- 左侧：资源文件名提取的 key（去掉 slug 前缀和时间戳后缀）
- 右侧：Markdown 中的场景 ID（`# scene_id` 的 scene_id 部分）
- 小游戏 key 格式：`${scene_id}_minigame`

如果资源文件名直接使用场景 ID 命名（如 `hp1_start_timestamp.webp`），则无需此配置文件。

---

## 阶段七：上传与提交

使用项目内置的自动化脚本将剧本、图片和小游戏代码一键部署到服务器。

### 7.1 配置准备

确保项目根目录下的 `.agent/config.json` 包含以下配置（如无则新建）：
```json
{
  "apiUrl": "https://muistory.com",
  "userId": "YOUR_USER_ID" // 必须是数据库中已存在的用户 ID
}
```

### 7.2 执行上传脚本

运行以下命令，脚本将自动扫描 `assets` 目录、上传所有资源、更新 Markdown 中的 URL 并提交游戏：

// turbo
```bash
MUI_ADMIN_PASSWORD=${MUI_ADMIN_PASSWORD} npx tsx scripts/upload-game-assets.ts \
  --file demo/${slug}/${script_name}.md \
  --assets demo/${slug}/assets \
  --slug ${slug}
```

### 7.3 脚本自动处理

上传脚本会自动完成以下操作：

1. **资源上传**：扫描 assets 目录，将所有图片和 JS 文件上传到 R2
2. **URL 填充**：更新 Markdown 中以下字段：
   - `image-gen` 块的 `url` 字段（场景图片）
   - `minigame-gen` 块的 `url` 字段（小游戏代码）
   - YAML front matter 中的 `cover` 字段（封面图）
   - YAML front matter 中角色的 `image_url` 字段（立绘）
3. **游戏提交**：将游戏内容保存到 Games 表
4. **小游戏入库**：自动读取 `minigame-gen` 块，将 JS 代码写入 Minigames 表

**智能去重**：如果 `url` 字段已经是 `http://` 或 `https://` 开头，脚本会跳过该资源的上传，避免重复上传。

**自动重试**：上传失败时自动重试 3 次，采用指数退避策略（1s, 2s, 3s）。

> 📖 **资源命名规范**：详见 [docs/ASSET_NAMING.md](docs/ASSET_NAMING.md)

### 7.4 验证结果

1. 检查终端输出是否显示 "Game submitted successfully!"
2. 打开剧本文件，确认 `url:` 字段已被替换为线上链接
3. 访问游戏后台预览链接进行测试

---

## 输出文件格式

最终剧本（包含线上资源链接）保存为 `.md` 文件，结构：

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
url: https://your-assets-domain.com/images/slug/timestamp-scene_id.webp
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

**Q: 图片生成配额耗尽怎么办？**
A: Gemini 图片生成有每5小时约25-30张的配额限制。遇到 `RESOURCE_EXHAUSTED` 错误时：
   1. 记录已生成的场景和待生成的场景列表
   2. 等待配额重置（通常5小时后）
   3. 继续生成剩余场景
   4. 可以先上传已有资源，剩余场景由游戏运行时 AI 动态生成

**Q: 如何查看还有多少场景未生成图片？**
A: 使用以下命令对比：
   ```bash
   # 查看剧本中所有场景
   grep -c '^# ' demo/${slug}/${script}.md
   # 查看已生成的场景图片
   ls demo/${slug}/assets/scene_*.webp | wc -l
   ```

---

## 环境变量

执行阶段七需要以下环境变量：

- `MUI_ADMIN_PASSWORD`: Admin 认证密钥

配置文件 `.agent/config.json` 包含：
- `apiUrl`: API 基础地址
- `assetsPublicDomain`: R2 公开域名
