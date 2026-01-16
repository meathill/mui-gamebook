---
description: 游戏资源生成指南 - 包含 Prompt 构建规则与工作流
---

# 游戏资源生成工作流

本指南规范了为游戏脚本生成美术资源（主要是图片）的标准流程，特别强调 Prompt 工程规则，以确保风格统一和角色准确。

## 1. 准备工作

在开始生成之前，必须分析游戏脚本 (`.md` 文件) 以获取上下文：

- **全局风格 (`ai.style.image`)**: 查找脚本开头的 `ai` 配置块。这是所有图片必须遵循的基调。
    - 示例: `Modern urbancore mixed with traditional Chinese aesthetics, cinematic lighting`
- **角色设定 (`ai.characters`)**: 收集所有角色的视觉特征。
    - **姓名**: ID 与显示名
    - **性征**: 明确的性别描述 (Young Asian man/woman)
    - **外观**: 发型、标志性服装、配饰 (e.g., Baoyu's Jade identity, Daiyu's minimalist style)
    - **示例**: `Daiyu: Young Asian woman, 20, pale complexion, elegant minimalist fashion.`

## 2. 图像生成 Prompt 规则

生成图片的 Prompt 必须严格遵循以下结构：

`Style: [全局风格]. Scene: [场景描述]. Characters: [角色详细描述]. Mood/Lighting: [氛围/光影]. Tech Specs: [技术参数]`

### 关键规则

1.  **强制包含风格**: 每一条 Prompt 的第一句必须是全局风格描述。
2.  **角色全量描述**: 永远不要只使用名字 (e.g., "Baoyu")。必须展开为详细描述 (e.g., "Baoyu (Young Asian man, streetwear, wearing jade pendant)"). **特别注意性别和关键特征**。
3.  **场景具体化**: 将剧本中的文字转化为视觉元素 (e.g., "Phone chat" -> "Close up of smartphone screen showing chat interface").
4.  **排他性/负向约束**: 如果工具支持或在 Prompt 中强调，应避免出现与设定不符的元素（如避免古装出现在现代场景，除非特意设计）。

### 示例

**错误 Prompt**:
> `Baoyu comforting Daiyu backstage.`

**正确 Prompt**:
> `Style: Modern urbancore mixed with traditional Chinese aesthetics, cinematic lighting. Scene: Backstage rest area, dimly lit with scattered equipment. Characters: Baoyu (Young Asian man, streetwear, gentle expression) holding the hand of Daiyu (Young Asian woman, wearing purple dress, looking melancholic). Atmosphere: Intimate, emotional. 8k.`

## 3. 执行流程

1.  **扫描待生成图片**: 使用 `scripts/find-pending-images.ts` 查找脚本中缺失 `url` 字段的图片块。
2.  **批量生成**: 根据 Prompt 规则构建请求，尽量分批处理（如每次 5-8 张）以免超时或额度耗尽。
3.  **格式转换**:
    - 将生成的 PNG 图片转换为 WebP 格式 (质量 85+)。
    - 命令参考: `cwebp -q 85 source.png -o dest.webp`
4.  **集成到脚本**:
    - 将图片移动到游戏的 `assets/` 目录。
    - 更新 `.md` 脚本中的 `url` 字段，指向 `assets/filename.webp`。
5.  **人工验证**:
    - 检查图片是否存在崩坏、性别错误（如 Baoyu/Daiyu 混淆）或风格不符。
    - 如有错误，**立即删除并记录原因**，不要勉强使用。
