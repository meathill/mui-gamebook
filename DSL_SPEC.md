# Gamebook DSL 设计文档

本文档概述了用于创建互动文字冒险游戏的领域特定语言（DSL）的设计，该语言利用类似 Markdown 的语法以简化创作过程。

## 1. 文件格式

游戏故事将以标准的 Markdown 文件（`.md` 扩展名）编写。

## 2. 全局配置 (YAML Front Matter)

所有的全局定义，包括游戏元数据、游戏状态和 AI 设置，都使用 YAML Front Matter 在游戏文件的最顶端进行定义。该区块由 `---` 分隔。

### 2.1 游戏元数据

这部分用于定义游戏本身的基础信息。

- **`title`** (必须): 游戏的标题。
- **`description`** (可选): 游戏的简短介绍。
- **`backgroundStory`** (可选): 游戏的背景故事，支持 Markdown 格式。如果设置了背景故事，游戏启动页面将显示渲染后的背景故事而非简短描述。
- **`cover_image`** (可选): 游戏的封面图片链接。
- **`cover_prompt`** (可选): 用于 AI 生成封面图片的提示词，方便后续修改和重新生成。
- **`cover_aspect_ratio`** (可选): 封面图片的宽高比，如 `3:2`、`16:9` 等。
- **`tags`** (可选): 一个用于分类的标签列表。
- **`published`** (可选): 布尔值，标记游戏是否已发布。默认为 `false`。

**示例：**
```yaml
---
title: "小红帽"
description: "一个关于小女孩和一只狡猾大灰狼的经典童话故事。"
backgroundStory: |
  # 第一章：起源

  很久很久以前，在一个宁静的小村庄边，住着一个可爱的小女孩。
  她总是穿着奶奶送给她的红色斗篷，因此大家都叫她"小红帽"。

  有一天，妈妈让她去看望住在森林那边的奶奶...
cover_image: "/assets/covers/lrrh_cover.png"
cover_prompt: "童话风格的小红帽封面，小女孩穿着红色斗篷站在森林边缘"
cover_aspect_ratio: "3:2"
tags: ["童话", "经典", "多分支"]
published: true
---
```

### 2.2 游戏状态 (`state`)

该对象持有游戏范围内的变量。每个变量可以是简单值，也可以是包含元数据的对象。

#### 2.2.1 简单变量

直接定义变量名和初始值：

```yaml
---
state:
  has_key: false
  gold: 10
---
```

#### 2.2.2 带元数据的变量

变量可以配置以下属性：

- **`value`** (必须): 变量的初始值（数字、字符串或布尔值）
- **`visible`** (可选): 是否在游戏界面显示，默认 `false`
- **`display`** (可选): 展示方式，可选值：
  - `value`: 直接显示数值（默认）
  - `progress`: 显示为进度条
  - `icon`: 显示为图标（适用于布尔值或物品）
- **`max`** (可选): 最大值，用于进度条展示
- **`label`** (可选): 显示名称，默认使用变量名
- **`trigger`** (可选): 触发器配置，当条件满足时跳转到指定场景
  - `condition`: 触发条件（如 `<= 0`、`== true`）
  - `scene`: 跳转的场景 ID

**示例：**

```yaml
---
state:
  health:
    value: 100
    visible: true
    display: progress
    max: 100
    label: "生命值"
    trigger:
      condition: "<= 0"
      scene: game_over
  gold:
    value: 10
    visible: true
    display: value
    label: "金币"
  has_key:
    value: false
    visible: false
  reputation:
    value: 50
    visible: true
    display: progress
    max: 100
    label: "声望"
---
```

### 2.3 AI 设置 (`ai`)

该对象包含用于指导 AI 生成素材的配置，以确保游戏在风格和角色表现上的一致性。

- **`style`**: 定义不同类型素材的全局美学风格。其值将作为提示词（Prompt）提供给 AI 模型。
  - **`image`**: 图片生成的风格描述
  - **`audio`**: 背景音乐的风格描述
  - **`tts`**: TTS 语音朗读的风格（如语气、语速、情感等）
- **`characters`**: 角色“设定卡”的集合。每个角色拥有一个唯一的 ID，并包含名称、描述以及用于生成其图片或声音的特定提示词等属性。

**示例：**

```yaml
---
ai:
  style:
    image: "奇幻, 水彩, 色彩鲜艳, 精细线条"
    audio: "史诗管弦乐, 电影感, 紧张"
    tts: "用讲童话故事的语气，语速适中，温柔亲切"
  characters:
    zhang_daxia:
      name: "张大侠"
      description: "一位中年剑客，神情冷峻，左眼上有一道长长的伤疤，身穿蓝色长袍。"
      image_prompt: "一位智慧而强大的中国剑客，40岁，左眼有疤"
      voice_name: "Aoede"
---
```

### 2.4 AI 上下文自动合并

当使用编辑器生成 AI 素材（图片、音频、视频）时，系统会自动将 `ai.style` 和 `ai.characters` 合并到用户的 prompt 中，以确保生成结果的风格一致性。

**合并规则：**

1. **图片/视频生成**：
   - 自动添加 `ai.style.image` 作为风格描述
   - 如果引用了角色（通过 `character` 或 `characters` 字段），自动添加角色的 `image_prompt` 描述

2. **音频生成**：
   - 自动添加 `ai.style.audio` 作为风格描述

3. **TTS 语音生成**：
   - 使用预设的声音配置（如 Aoede 温和女声）

**示例：**

用户 prompt：
```
小红帽在森林里行走
```

合并后的完整 prompt：
```
风格：奇幻, 水彩, 色彩鲜艳

角色：
- 小红帽：穿着红色斗篷的可爱小女孩，约8岁

小红帽在森林里行走
```

> [!TIP]
> 在创建游戏前，建议先配置好 `ai.style` 和 `ai.characters`，这样后续生成的所有素材都会保持一致的风格。

## 3. 场景 (Scenes)
A game is composed of multiple scenes. Each scene represents a specific moment or location in the narrative.

### 3.1 场景定义

每个场景由一个 ATX 风格的一级 Markdown 标题（`#`）后跟一个唯一的 `SceneID` 来定义。

**示例：**

```markdown
# start
```

### 3.2 场景分隔

场景之间由 Markdown 的水平分割线（`---`）分隔。

### 3.3 默认启动场景

所有游戏都**必须**包含一个 `SceneID` 为 `start` 的场景。

当游戏加载时，播放器将默认从这个场景开始。

### 3.4 游戏结束

所有没有选项的场景都被视为游戏结束场景。此场景之后会显示游戏结束界面，允许玩家重新开始游戏。
所以我们不需要手动回到 `start` 场景，除非这是游戏设计的一部分。

## 4. 场景内容

在每个场景中，内容可以包括图片（静态或 AI 生成）、音频、视频、描述性文本和玩家选项。

### 4.1 静态图片

使用标准的 Markdown 图片语法 `![替代文本](图片链接)` 来包含静态图片。

**示例：**

```markdown
![森林岔路口](https://picsum.photos/800/400)
```

### 4.2 AI 生成的素材

对于动态内容，DSL 使用带有特定语言标签（`image-gen`, `audio-gen`, `video-gen`）的代码块来指示引擎调用 AI 模型。**在素材生成后，游戏引擎或编辑器会将生成的 `url` 写回到代码块中，用于缓存和预览，确保 Markdown 文件本身始终是唯一的数据源。**

- **`prompt`**: (必须) 用于指导 AI 生成的提示词。
- **`character`**: (可选) 引用在 `ai.characters` 中定义的角色 ID，以使用其特定的 `image_prompt`。
- **`url`**: (可选) 由引擎或编辑器在生成后自动填入的素材链接。

#### 4.2.1 图像生成 (`image-gen`)

**语法：**
````
```image-gen
prompt: A descriptive prompt for the image.
character: characterID (可选，单人模式，向后兼容)
characters: [charID1, charID2] (可选，多人模式，推荐)
url: https://... (optional, auto-filled after generation)
```
````

**示例：**
````
```image-gen
prompt: 小红帽在森林里遇到了大灰狼
characters: [lrrh, wolf]
url: https://ai-provider.com/generated/image456.png
```
````

##### 角色引用语法

在 prompt 中可以使用 `@角色ID` 语法引用在 `ai.characters` 中定义的角色，这提供了一种更灵活的内联引用方式。

**语法：** `@角色ID`

**示例：**
````
```image-gen
prompt: @lrrh 站在森林的小路上，@wolf 从树后探出头来
```
````

当使用 `@角色ID` 语法时，系统会：
1. 自动将角色的 `image_prompt` 描述添加到生成提示中
2. 将 `@角色ID` 替换为角色名称以生成更自然的描述
3. 如果角色有 `image_url`（头像），将其作为参考图片发送给 AI 以保持角色视觉一致性

> [!TIP]
> 在编辑器中，输入 `@` 会弹出角色选择列表，选择后会显示高亮的角色名称标签，提供类似聊天软件的 @ 提及体验。


#### 4.2.2 音频生成 (`audio-gen`)

**语法：**
````
```audio-gen
type: background_music | sfx
prompt: A descriptive prompt for the audio.
url: https://... (optional, auto-filled after generation)
```
````

**示例：**
````
```audio-gen
type: background_music
prompt: 一段紧张、悬疑的洞穴探索背景音乐
```
````

#### 4.2.3 视频生成 (`video-gen`)

**语法：**
````
```video-gen
prompt: A descriptive prompt for the video.
url: https://... (optional, auto-filled after generation)
```
````

#### 4.2.4 小游戏生成 (`minigame-gen`)

小游戏是一种特殊的互动内容，由 AI 生成简单的 JavaScript 游戏。小游戏可以读取和修改游戏变量，但不直接控制场景跳转——场景跳转仍由选项的条件判断处理。

**语法：**
````
```minigame-gen
prompt: 描述小游戏的玩法和规则
variables:
  - variable_name: 变量用途说明
url: https://... (optional, auto-filled after generation)
```
````

**参数说明：**
- **`prompt`** (必须): 描述小游戏的详细规则和玩法
- **`variables`** (可选): 小游戏会使用和修改的变量列表，键为变量名，值为用途说明
- **`url`** (可选): 生成后的小游戏 JS 链接，或 `pending:operationId` 表示正在生成中

**示例：**
````
```minigame-gen
prompt: 创建一个点击金色飞贼的游戏。屏幕上会随机出现金色小球，玩家需要在10秒内点击10次金色飞贼才算成功。每次点击成功增加 snitch_caught 变量。
variables:
  - snitch_caught: 捕获的飞贼数量
url: https://assets.example.com/minigames/snitch-game.js
```
````

**小游戏 JS 接口规范：**

生成的小游戏 JS 文件必须导出以下接口：

```typescript
interface MiniGameAPI {
  // 初始化游戏，传入 DOM 容器和当前变量值
  init(container: HTMLElement, variables: Record<string, number | string | boolean>): void;
  // 注册游戏完成回调，返回修改后的变量
  onComplete(callback: (variables: Record<string, number | string | boolean>) => void): void;
  // 销毁游戏，清理资源
  destroy(): void;
}
```

**使用示例：**

结合变量触发器和条件选项，可以实现根据小游戏结果跳转到不同场景：

```markdown
# quidditch_match

魁地奇比赛开始了！你需要抓住金色飞贼！

```minigame-gen
prompt: 创建一个点击金色飞贼的游戏，10秒内点击10次随机出现的金色小球即可获胜
variables:
  - snitch_caught: 捕获的飞贼数量
```

* [比赛结束] -> quidditch_win (if: snitch_caught >= 10)
* [比赛结束] -> quidditch_lose (if: snitch_caught < 10)
```

**小游戏开发指南：**

1. **简单原则**：小游戏应该是简单的互动，如点击、拖拽、记忆配对等，不应依赖外部库
2. **使用 Canvas**：推荐使用 Canvas API 进行绘制，确保跨浏览器兼容性
3. **变量交互**：通过 `variables` 参数接收初始值，通过 `onComplete` 回调返回修改后的值
4. **资源清理**：`destroy()` 方法必须清理所有事件监听器、定时器和动画帧
5. **响应式设计**：游戏应适应容器大小，支持不同屏幕尺寸

**支持的小游戏类型示例：**

- 点击类：点击目标、打地鼠
- 记忆类：翻牌配对、记忆序列
- 反应类：快速反应测试
- 收集类：限时收集物品
- 简单射击：击中移动目标

### 4.3 描述性文本

场景的描述性文本可以使用标准 Markdown 编写。

### 4.4 变量插值

在场景文本和选项文本中，可以使用 `{{变量名}}` 语法插入变量的当前值。这使得文本能够动态显示游戏状态。

**语法：** `{{变量名}}`

**示例：**

```markdown
你现在有 {{gold}} 金币，生命值为 {{health}}。

{{player_name}}，你已经走过了很长的路。

* [花费 10 金币购买药水（当前：{{gold}} 金币）] -> buy_potion (if: gold >= 10) (set: gold = gold - 10)
```

**说明：**
- 变量名必须与 `state` 中定义的变量名完全匹配
- 如果变量不存在，将保留原始的 `{{变量名}}` 文本
- 支持数字、字符串和布尔值类型的变量
- 变量插值会在每次场景渲染时实时计算

### 4.5 TTS 语音 (Text-to-Speech)

场景文本和选项可以附带语音朗读，适合儿童阅读器等场景。语音使用 Gemini TTS 模型生成，存储在 R2 中。

#### 4.5.1 文本语音

文本节点可以通过 HTML 注释附带语音 URL：

**语法：**
```markdown
这是场景的描述性文本。
<!-- audio: https://assets.example.com/audio/scene-text.wav -->
```

**说明：**
- 语音 URL 通过 HTML 注释 `<!-- audio: URL -->` 存储
- 注释必须紧跟在文本之后
- 播放器会在场景加载时自动播放语音

#### 4.5.2 选项语音

选项可以通过 `(audio: URL)` 子句附带语音：

**语法：** `* [选项文本] -> NextSceneID (audio: URL)`

**示例：**
```markdown
* [继续冒险] -> next_scene (audio: https://assets.example.com/audio/choice.wav)
* [购买药水] -> shop (set: gold = gold - 10) (audio: https://assets.example.com/audio/buy.wav)
```

**说明：**
- `(audio: URL)` 子句可以与 `(if:)` 和 `(set:)` 子句一起使用
- 播放器会在选项按钮上显示播放图标
- 点击播放图标播放语音，点击按钮执行选项

#### 4.5.3 语音生成

语音可以通过以下方式生成：

1. **编辑器手动生成**：在编辑器中点击"生成语音"按钮
2. **批量生成**：使用 `asset-generator` 命令行工具

**命令行生成：**
```bash
cd packages/asset-generator
pnpm generate remote <game-id>  # 生成所有素材（包括 TTS）
pnpm generate remote <game-id> --force  # 强制重新生成
```

**声音选项：**

可以通过环境变量 `DEFAULT_TTS_VOICE` 设置默认声音：
- `Aoede` - 温和女声（默认，推荐儿童故事）
- `Kore` - 活泼女声
- `Puck` - 活泼男声
- `Leda` - 温柔女声
- `Charon` - 沉稳男声

## 5. 选项与互动

玩家通过场景末尾呈现的选项进行互动。

### 5.1 基本选项

一个基本选项是一个无序列表项（`*`），后跟方括号中的选项文本，一个箭头 `->`，以及过渡到的场景的 `SceneID`。

**语法：** `* [选项文本] -> NextSceneID`

**示例：**

```markdown
* [向左走] -> forest_path
```

### 5.2 带状态修改的选项

选项可以修改全局游戏状态。这通过在 `NextSceneID` 之后添加一个 `(set: key = value)` 子句来完成。多个状态修改可以用逗号分隔。值可以是字面量（字符串、数字、布尔值）或涉及现有状态变量的简单表达式。

**语法：** `* [选项文本] -> NextSceneID (set: key = value, anotherKey = anotherKey + 1)`

**示例：**

```markdown
* [拾取钥匙] -> room_with_key (set: has_key = true, gold = gold + 5)
* [攻击怪物] -> combat_scene (set: health = health - 10)
```

### 5.3 条件选项

选项可以根据当前游戏状态有条件地显示。这通过在 `NextSceneID` 之后添加一个 `(if: condition)` 子句来完成。条件可以使用标准比较运算符（`==`, `!=`, `>`, `<`, `>=`, `<=`）与状态变量和字面量进行比较。

**语法：** `* [选项文本] -> NextSceneID (if: condition)`

**示例：**

```markdown
* [尝试用钥匙开门] -> treasure_room (if: has_key == true)
* [用力推门] -> door_does_not_budge (if: has_key == false, health > 50)
```

---

本文档将随着 DSL 的演进而更新。
