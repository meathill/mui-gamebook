# Gamebook DSL 设计文档

本文档概述了用于创建互动文字冒险游戏的领域特定语言（DSL）的设计，该语言利用类似 Markdown 的语法以简化创作过程。

## 1. 文件格式

游戏故事将以标准的 Markdown 文件（`.md` 扩展名）编写。

## 2. 全局配置 (YAML Front Matter)

所有的全局定义，包括游戏状态和 AI 设置，都使用 YAML Front Matter 在游戏文件的最顶端进行定义。该区块由 `---` 分隔。

### 2.1 游戏状态 (`state`)

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

### 2.2 AI 设置 (`ai`)

该对象包含用于指导 AI 生成素材的配置，以确保游戏在风格和角色表现上的一致性。

- **`style`**: 定义不同类型素材的全局美学风格。其值将作为提示词（Prompt）提供给 AI 模型。
- **`characters`**: 角色“设定卡”的集合。每个角色拥有一个唯一的 ID，并包含名称、描述以及用于生成其图片或声音的特定提示词等属性。

**示例：**

```yaml
---
# 为简洁起见，此处省略 'state'，但实际使用时应包含
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
    goblin:
      name: "哥布林"
      description: "一种绿色的小型生物，狡猾而淘气。"
      image_prompt: "一只小巧、淘气的绿色哥布林，奇幻风格"
---
```

## 3. 场景 (Scenes)

一个游戏由多个场景组成。每个场景代表故事中的一个特定时刻或地点。

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

对于动态内容，DSL 使用带有特定语言标签（`image-gen`, `audio-gen`, `video-gen`）的代码块来指示引擎调用 AI 模型。

#### 4.2.1 图像生成 (`image-gen`)

生成场景图片。局部的 `prompt` 可以与全局风格和角色提示词结合使用。

**语法：**
````
```image-gen
prompt: 用于描述图像的提示词。
character: characterID (可选，用于使用角色的 `image_prompt`)
```
````

**示例：**
````
```image-gen
prompt: 一条雄伟的巨龙在雪山之巅上空盘旋
```
````

#### 4.2.2 音频生成 (`audio-gen`)

生成背景音乐或音效。

**语法：**
````
```audio-gen
type: background_music | sfx
prompt: 用于描述音频的提示词。
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

*注意：这是一个前瞻性功能。* 它将用于生成短视频剪辑或动画。

**语法：**
````
```video-gen
prompt: 用于描述视频的提示词。
```
````

**示例：**
````
```video-gen
prompt: 一段雨滴落在窗格上并不断滑落的循环动画
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