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
- **`characters`**: 角色“设定卡”的集合。每个角色拥有一个唯一的 ID，并包含名称、描述以及用于生成其图片或声音的特定提示词等属性。

**示例：**

```yaml
---
# 为简洁起见，此处省略其他元数据，但实际使用时应包含
ai:
  style:
    image: "奇幻, 水彩, 色彩鲜艳, 精细线条"
    audio: "史诗管弦乐, 电影感, 紧张"
  characters:
    zhang_daxia:
      name: "张大侠"
      description: "一位中年剑客，神情冷峻，左眼上有一道长长的伤疤，身穿蓝色长袍。"
      image_prompt: "一位智慧而强大的中国剑客，40岁，左眼有疤"
      voice_sample_url: "/assets/voices/zhang_daxia_sample.wav"
---
```

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

所有游戏都**必须**包含一个 `SceneID` 为 `start` 的场景。当游戏加载时，播放器将默认从这个场景开始。

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

## 6. IP 版权保护 (Story Protocol)

MUI Gamebook 支持通过 Story Protocol 将您的作品注册为 IP Asset，在区块链上永久记录您的版权。

### 6.1 功能说明

- **IP 注册**：将整个游戏剧本注册为一个 IP Asset
- **区块链记录**：在 Story Protocol 的 Aeneid 测试网上创建不可篡改的版权证明
- **NFT 铸造**：自动铸造代表您作品的 NFT
- **元数据存储**：作品元数据存储在 IPFS 上，永久可访问

### 6.2 如何使用

1. 在编辑器的「设置」标签页中找到「IP 版权保护」区块
2. 点击「注册 IP 版权」按钮
3. 确认操作后，系统将自动：
   - 上传作品元数据到 IPFS
   - 在 Story Protocol 上铸造 NFT 并注册 IP
   - 在数据库中记录 IP 信息

### 6.3 注册后

注册成功后，您可以：
- 在设置页面查看 IP ID 和交易详情
- 通过链接访问 Story Protocol 区块浏览器查看您的 IP Asset
- 在未来扩展中，可以基于此 IP 创建衍生作品或进行授权

### 6.4 注意事项

- IP 注册是**不可撤销**的操作
- 需要配置 Story Protocol 私钥和 Pinata JWT 环境变量
- 目前使用 Aeneid 测试网，正式版将迁移到主网

---

本文档将随着 DSL 的演进而更新。
