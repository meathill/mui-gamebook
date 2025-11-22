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
- **`cover_image`** (可选): 游戏的封面图片链接。
- **`tags`** (可选): 一个用于分类的标签列表。
- **`published`** (可选): 布尔值，标记游戏是否已发布。默认为 `false`。

**示例：**
```yaml
---
title: "小红帽"
description: "一个关于小女孩和一只狡猾大灰狼的经典童话故事。"
cover_image: "/assets/covers/lrrh_cover.png"
tags: ["童话", "经典", "多分支"]
published: true
---
```

### 2.2 游戏状态 (`state`)

该对象持有游戏范围内的变量，如统计数据、物品栏或环境条件。

**示例：**

```yaml
---
state:
  has_key: false
  health: 100
  gold: 10
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
character: characterID (optional)
url: https://... (optional, auto-filled after generation)
```
````

**示例：**
````
```image-gen
prompt: 一条雄伟的巨龙在雪山之巅上空盘旋
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

*注意：这是一个前瞻性功能。*

**语法：**
````
```video-gen
prompt: A descriptive prompt for the video.
url: https://... (optional, auto-filled after generation)
```
````

### 4.3 描述性文本

场景的描述性文本可以使用标准 Markdown 编写。

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