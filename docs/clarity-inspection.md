# Clarity 巡检指南

用 Microsoft Clarity 回放 + 洞察数据发现产品体验问题的方法。**巡检只负责发现和记录问题：发现问题开 GitHub issue，不在巡检过程中顺手改代码。**

## 项目与访问

- 后台：<https://clarity.microsoft.com/projects/view/zh74gh2cce/dashboard>（项目名 MuiStory）
- 前端集成：`packages/app/src/components/Clarity.tsx`，构建期变量 `NEXT_PUBLIC_CLARITY_ID`
- Clarity 自动采集点击/滚动/路由，无需埋点；数据有延迟，新版本上线后约几分钟到数十分钟开始出现新数据

## 巡检流程

### 1. 仪表盘概览（Overview，默认最近 3 天）

先看四个核心指标，再看 Insights 四张卡：

| 指标 | 关注点 |
|---|---|
| Sessions / Unique users | 样本量。**< 20 会话时只看绝对数，不要看百分比结论** |
| Pages per session | 是否有人在浏览站内链路 |
| Scroll depth | 首屏内容是否被消费 |
| Active time | 2.9/5.5 min 这类"活跃/总时长"比例，反映 tab 切换频繁度 |

Insights：Rage clicks / **Dead clicks** / Excessive scrolling / **Quick backs**。
另外看 Performance（LCP/INP/CLS）、Top pages、Referrers、Browsers、JS errors。

### 2. 洞察下钻

- 左侧导航（折叠在 Dashboards 下）有 Rage clicks / Dead clicks / Quick backs / Clicked text / JavaScript errors 明细页
- 数据少时明细页信息有限，直接跳到回放看过程

### 3. 回放分析（Recordings）

- 列表按 `Entry / Exit / Duration / Clicks / Pages / User ID` 快速筛选可疑会话：**时长极短 + 点击多 + 页面多 = 卡壳**；**时长长 + 点击多 = 最丰富的行为样本**
- 打开回放 → `More details` 打开事件时间线，逐条读事件重建用户行为链

### 4. 代码验证

时间线事件 + 代码 grep 互证后再下结论。例：回放显示"点返回游戏库 → 落地首页 → 2 秒 quick back"，再 grep `backToLibrary` 发现 `href="/"`，才能确认是链接目标错误而不是偶发行为。

## 时间线事件词汇表

| 事件 | 含义 / 判读 |
|---|---|
| `Page visit: <url>` | 页面到达（含 SSR 首屏与客户端路由）。无 click 事件时出现，通常是浏览器后退/前进（移动端手势/返回键不产生 click） |
| `Click: "<文本>"` | 点击。文本是最近的可访问名称；移动端 tap 的文本归属可能不准，不要过度相信 |
| `Dead click` | 点击后短时间内无任何页面/交互响应。两类常见：**水合前点击被吞**、**静态元素被误认为可交互** |
| `Quick back click` | 进入某页后 1–2 秒内退回上一页。多半是**目标页与预期不符**（链接指向错误、内容空、加载失败） |
| `Resized page` | 移动端地址栏收起/展开、旋转；不是用户行为，忽略 |
| `Page hidden` | tab 切后台/离开，会话接近结束 |
| `Expand details` | 点开某事件的细节，可看坐标、元素、目标 URL |

## 指标解读注意

- **死点击/快速返回的百分比分母是会话数**。6 会话里 3 个死点击 = 50%，看起来吓人但绝对值只有 3
- **LCP/INP/CLS 是真实用户数据**，样本个位数时单点异常会拉爆均值；先看样本量（"from N pageviews"），再看 URL 分布
- **Bot sessions 不计入总数**（卡片上单独标注）
- Clarity 的 URL 明细、Funnels 等高级卡片在样本不足时不渲染，不要误判为故障

## 问题 → Issue 规范

巡检产出物是 issue，不是 commit。创建时遵循既有标题习惯：

```
[P?][类别] 一句话结论
```

类别示例：`[UX]`、`[Perf]`、`[SEO]`、`[调查]`。正文必须包含：

1. **背景**：巡检日期、样本量
2. **证据**：回放 ID/用户 ID + 时间线片段（带时间戳）
3. **推断**：多种可能原因，标明置信度
4. **建议方向**：下一步排查动作
5. **验收**：可观测的成功标准（Clarity 指标 / GA4 事件）

## 已沉淀的判定模式

| 现象 | 常见原因 | 验证方式 |
|---|---|---|
| 同一目标连点 2–3 次才生效 | 水合前点击被吞（慢网络/低端机） | 时间线上点击时间差 <3s + 页面刚加载；本地 throttle 复现 |
| 点击 → 7 秒后 Dead click | 同上，点击后无响应直到用户再点 | 看点击间隔与首个 Page visit 的时间差 |
| 点击静态图形（进度条/属性条）判 Dead click | 元素看起来可交互但无交互 | 对照游戏 UI 实现，确认该元素无 onClick |
| 进入页面 1–2 秒内退回 | 链接目标错误 / 页面内容不符预期 | 回放定位点击元素 → 查该链接 href |
| 同一 URL 反复出现且无点击 | 移动端返回键/手势后退 | 无 click 事件 + 相邻 Page visit 成对出现 |

## 历史案例

- **2026-11-22**：回放发现「返回游戏库」指向 `/` 而非 `/games`（EndScreen + TitleScreen ×2），用户每次通关都要 quick back 再手动去游戏库；同时发现 my/admin 登录墙不带 `redirect`，登录后回首页丢失意图。修复 commit `381ac9f`。
- **2026-11-22**：死点击 50%、LCP 28s（n=1）、AI 直链落地 0 点击 → 记录为 issue #31 / #32 / #33，留待数据积累后复核。
