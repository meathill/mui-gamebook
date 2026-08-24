import type { BlogPost } from './blog';

export const STATIC_BLOG_POSTS: BlogPost[] = [
  {
    id: 'how-to-create-interactive-fiction-with-markdown',
    title: '如何用 Markdown 制作互动小说？从零开始的文字冒险创作指南',
    slug: 'how-to-create-interactive-fiction-with-markdown',
    description:
      '详尽的 Markdown 互动小说制作教程：无需编程，用简单纯文本语法设计分支剧情、变量系统与多结局；结合顶尖 AI 灵感副驾实现自动润色、场景生图、音乐配乐与角色语音，一键发布你的第一部文字冒险游戏！',
    category: 'tutorial',
    tags: [
      { tag: '互动小说' },
      { tag: '文字冒险' },
      { tag: 'Markdown' },
      { tag: '创作教程' },
      { tag: 'AI写作' },
      { tag: '游戏书' },
    ],
    author: '姆伊游戏书',
    coverUrl: '/hero-bg.png',
    publishedAt: '2026-08-24T12:00:00.000Z',
    createdAt: '2026-08-24T12:00:00.000Z',
    updatedAt: '2026-08-24T12:00:00.000Z',
    status: 'published',
    content: `
你是否曾经在阅读小说时，因主角做出的愚蠢决定而抓狂，恨不得替他做出选择？或者你脑海中有一个宏大的故事构想，拥有错综复杂的世界观和多种可能的发展方向，却苦于不会写代码、不会使用复杂的视觉小说引擎（如 Ren'Py 或 Unity）而迟迟无法动笔？

**互动小说（Interactive Fiction）与文字冒险游戏（Text Adventure Game）**，正是连接传统文学与交互式电子游戏的最佳桥梁。而现在，借助 **Markdown 标记语言** 与 **现代全模态 AI 创作工具**，制作一部属于你自己的互动小说从未如此简单。

本文将手把手带你了解互动小说的核心设计原理，掌握使用 Markdown 书写分支故事的标准语法，并展示如何利用 AI 灵感副驾与多模态生成技术，十倍速打造并发布一部兼具可玩性与沉浸感的互动游戏书。

---

## 1. 什么是互动小说与游戏书（Gamebook）？

互动小说（Interactive Fiction，简称 IF）起源于 20 世纪 70 年代的文字冒险游戏与风靡全球的《Choose Your Own Adventure》（战斗游戏书）。

与传统线性小说「作者写、读者看」的单向灌输不同，互动小说的核心魅力在于**「选择权」与「代入感」**：
- **读者即主角**：读者的每一次抉择，都直接决定了角色的生死存亡、阵营走向以及最终的故事结局。
- **分支网状叙事**：同一个开局，可以衍生出数十种不同的探索路径，蕴含丰富的「二周目」重玩价值。
- **轻量而专注想象力**：无需像 3D 大作那样耗费数年建模渲染，文字本身就是最具张力的渲染引擎。

---

## 2. 为什么选择 Markdown 进行互动小说创作？

传统视觉小说引擎往往要求创作者掌握 Python 脚本或逻辑节点连线，这对绝大多数以文字见长的作家和剧情策划而言门槛极高。而使用 **Markdown** 具有无可比拟的优势：

1. **纯文本语法，零学习成本**：只需学会用 \`#\` 标记场景、用 \`*\` 标记选项，几分钟就能上手。
2. **纯粹专注故事本身**：没有复杂的软件界面干扰，打开任何编辑器都能随时随地记录灵感。
3. **版本控制与协作友好**：纯文本文件可以轻松进行 Git 版本管理，分支冲突一目了然。
4. **跨平台兼容与一键编译**：一份 Markdown 剧本既能在 Web 端即点即玩，也能无缝转换为桌面应用或导出为标准剧本格式。

---

## 3. 姆伊游戏书的核心语法规范

在「姆伊游戏书」中，我们基于标准 Markdown 扩展了一套极为直观的互动小说 DSL（领域特定语言）。

### (1) 基础场景与选项跳转
每个场景以一级标题 \`# 场景ID\` 开头，正文为剧情叙述，末尾使用列表书写选项与跳转目标：

\`\`\`markdown
# start
你从昏迷中醒来，发现自己身处一间冰冷的石室中，头顶的天窗洒下一缕苍白月光。
墙角有一扇虚掩的生锈铁门，另一侧的地砖似乎有些松动。

* [推开虚掩的铁门] -> corridor
* [蹲下检查松动的地砖] -> inspect_floor
\`\`\`

### (2) 变量状态与条件分支
互动游戏往往需要记录玩家的血量、金币、好感度或关键道具。在故事开头的 Frontmatter 中定义全局状态，即可在后续场景中进行数值增减与分支判定：

\`\`\`markdown
---
title: 迷雾庄园
state:
  health: 100
  has_rusty_key: false
---

# inspect_floor
你用力撬开地砖，在厚厚的尘土中摸出了一把生锈的黄铜钥匙！
{set: has_rusty_key = true}

* [拿着钥匙走向铁门] -> corridor

# corridor
走廊尽头是一扇厚重的木门，门锁上布满了铜绿。

* [使用黄铜钥匙开锁] -> secret_library {if: has_rusty_key}
* [用身体用力撞门] -> smash_door
\`\`\`

---

## 4. 实战演示：10 分钟写出你的第一个文字冒险剧本

让我们将上述语法融会贯通，写一个完整的密室微剧本《迷雾庄园·序章》：

\`\`\`markdown
---
title: 迷雾庄园·序章
description: 一场突如其来的暴风雨将你困在古老的庄园中，隐藏在阴影下的秘密正悄然苏醒。
cover_image: https://i.muistory.com/images/demo/manor_cover.webp
tags:
  - 悬疑
  - 解谜
  - 密室
state:
  sanity: 100
  found_diary: false
---

# start
暴雨如注，闪电撕裂夜空，照亮了庄园大厅正中央那幅诡异的贵族肖像画。
画像中男人的双眼仿佛在随着你的走动而移动。

* [仔细端详那幅肖像画] -> inspect_painting
* [走向壁炉寻找取暖工具] -> fireplace
* [尝试推开大门离开庄园] -> try_exit

# inspect_painting
你走近肖像画。借着闪电的余光，你注意到画框右下角刻着一行小字：“唯有真相可破迷雾”。
画框夹层里掉出了一张泛黄的日记残页！
{set: found_diary = true}

* [捡起日记残页走向壁炉] -> fireplace

# fireplace
壁炉里的余烬散发着微弱的温度，旁边有一把铁质火钳和一本锁着的皮质账本。

* [借助火光阅读日记与账本] -> read_diary {if: found_diary}
* [用火钳拨动壁炉余烬] -> stir_ashes

# read_diary
日记上赫然记录着庄园地窖隐藏金库的暗号！你解开了庄园最大的谜团。

* [恭喜通关！达成结局：真理之眼] -> ending_good

# try_exit
你用力转动大门把手，然而大门已被铁链从外部死死锁住。门外传来了一阵令人毛骨悚然的狼嚎...
{set: sanity = sanity - 20}

* [心有余悸地退回大厅] -> start
\`\`\`

---

## 5. 顶尖 AI 辅助创作：全模态赋能你的互动故事

独自创作网状剧情时，最大的痛点莫过于**文笔枯竭、分支逻辑遗漏，以及缺乏配图与音效**。姆伊游戏书全面接入了顶尖大模型与全模态生成套件：

### (1) 随时恭候的 AI Chatbot 灵感副驾
- **剧情推演**：卡文时，让 AI 副驾为你构思 3 种反套路的支线走向。
- **人物对话润色**：一键提升不同性格角色的台词辨识度。
- **逻辑一致性审查**：自动扫描整个 Markdown 剧本，找出死胡同场景（无法到达或没有出口的孤岛节点）及变量冲突。

### (2) 全模态多媒体资产一键注入
- **🎨 AI 场景生图**：根据场景描写自动提取 prompt，生成与世界观高度统一的高清背景与角色立绘。
- **🎬 AI 动态过场视频**：为高潮决战或关键剧情分支生成沉浸感十足的动态视频过场。
- **🎵 AI 情绪配乐与音效**：智能解析剧情张力，合成契合气氛的背景音乐与环境音效。
- **🎙️ AI 角色配音 (TTS) 与声音克隆**：赋予角色富含情感的真实嗓音，甚至为主角定制专属声线。

---

## 6. 一键发布与跨平台分享

完成 Markdown 剧本编写后，在姆伊游戏书创作者后台点击**「一键发布」**：
1. **即点即玩 Web 体验**：自动生成独立的移动端/桌面端交互网页，读者无需下载任何 App，点击链接或扫描二维码即可直接在浏览器畅玩。
2. **独立 OpenGraph 卡片**：自动提取专属封面与故事简介，分享到微信、QQ、X (Twitter)、即刻等社交平台时展示精美卡片。
3. **独立二级域名支持**：支持绑定创作者个性化专属二级域名。
4. **多端导出规划**：支持一键导出为 Ren'Py 脚本或桌面离线包，方便上架 Steam 与 itch.io。

---

## 7. 互动小说创作的 5 个黄金法则

1. **开局 3 分钟建立核心动机**：在第一个场景就抛出悬念或明确目标，让读者迅速产生代入感。
2. **避免无意义的「伪分支」**：如果两个选项的结果完全一样，读者会产生被欺骗的挫败感；让每个选择至少影响一句对话、一个变量或一个微小细节。
3. **善用「菱形网状结构」**：分支展开后适时收敛到关键关键主线节点，再重新发散，既能控制创作工作量，又能保障剧情主线不失控。
4. **变量透明与反馈及时**：当玩家做出影响数值的抉择时，通过 UI 变动或环境描写给予即时反馈。
5. **打磨至少 3 个有差异化的终局**：一个普通的结局、一个令人唏嘘的坏结局、一个需要深思熟虑才能达成的真结局。

---

## 立即开启你的互动创作之旅

创作一个好故事，不需要昂贵的开发团队，也不需要深奥的编程技术。打开你的 Markdown 编辑器，构思第一个场景，让文字在读者的每一次选择中绽放生机！

👉 [立即前往姆伊游戏书后台创建你的第一部故事](/create)
`,
  },
];

export function getStaticBlogPostBySlug(slug: string): BlogPost | null {
  return STATIC_BLOG_POSTS.find((p) => p.slug === slug) || null;
}

export function getStaticBlogPosts(options?: { limit?: number; page?: number; category?: string }): {
  docs: BlogPost[];
  totalDocs: number;
  totalPages: number;
} {
  const { limit = 10, page = 1, category } = options || {};
  let filtered = STATIC_BLOG_POSTS;
  if (category) {
    filtered = filtered.filter((p) => p.category === category);
  }
  const totalDocs = filtered.length;
  const totalPages = Math.ceil(totalDocs / limit);
  const start = (page - 1) * limit;
  const docs = filtered.slice(start, start + limit);
  return { docs, totalDocs, totalPages };
}
