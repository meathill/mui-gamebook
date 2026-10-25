---
name: muistory-media-assistance
description: 站方（管理员）通过 media-assistance MCP 为 muistory.com 已发布作品补齐角色图、封面和场景图。用于“给没图的作品配图”“补封面”“消灭占位图封面”等运营任务。内部运维用，不面向创作者。
---

# muistory 素材协助（媒体补全）

为已发布、缺图的作品生成并应用素材。社区对 AI 有顾虑：只填空、不覆盖作者素材、不改剧情，作者始终可以一键撤回、退出。

## 前置

- MCP 端点：`https://muistory.com/api/mcp/media-assistance`，JSON-RPC `tools/call`，`Authorization: Bearer $MUISTORY_ACCESS_TOKEN`。
- **绝不打印/回显** `MUISTORY_ACCESS_TOKEN`、`MIMO_API_KEY`、`MEDIA_ASSISTANCE_REVERT_SECRET` 等密钥。
- 工具：`claimMediaAssistanceWork`（可传 `gameId`，排序：作者已开启 → 无图作品 → 访问量）、`saveMediaAssistancePlan`、`claimMediaAssistanceItem`、`updateMediaAssistanceItem`（checkpoint/pause/resume）、`applyMediaAssistanceAsset`、`finishMediaAssistanceWork`。
- 上传：`POST /api/agent/media-assistance/upload?gameId=&inputHash=`，带 `X-Execution-Token`、`X-Content-SHA256`。见 `scripts/`。
- 每个作品一个本地工作目录（如 `work/<gameId>/`）：`characters.md`、`refs.json`、`imgs.json`、`requests.json`（requestId 必须持久化，重试复用）、`progress.md`。

## 生成渠道（硬规则）

- 图片/视频：只用 agent 自己的生图/视频工具（用户订阅额度）。**禁止**调用站点自己的 AI API 生成。
- 音频：只走 MiMo。**禁止** edge-tts。
- 本轮只做图片时，音频项用 `pause` 并写明原因（如“本轮仅图片”）。

## 选题

- 跳过场景数为个位数的作品——但仍要补封面：**已发布作品不允许留占位图或空封面**（`placeholder-cover` 视为无封面）。
- 同人/版权敏感改编：**只做封面**，避开原作角色、徽章、标志；不做场景图。
- 不适合配图的内容（如伤害儿童）：不做场景，说明原因。

## 流程

1. **审剧本**（生成前）。列出结构问题作为“给作者的备注”：坏跳转（指向不存在场景）、到不了的场景、`start` 无选项、空占位场景、被转义的箭头（`\->`）、括号不配对的条件、从不变化的触发变量、重复选项、同一场景多个图片块。剧情由作者改，我们**照样生成素材**（有了画面作者更有动力完善故事）。
2. **角色设定表**：每个角色固定脸型、发型、年龄、服装、妆容，写入 `characters.md`，所有 prompt 复用原文。作品已有角色图时以作品自身形象为准（同系列不同作品形象不一致时，不强套系列设定，告知人类）。只在文字中提到、画面不出现的角色：pause 其 portrait 项。
3. **按阶段生成，每阶段上传并 apply 后再进入下一阶段**：
   1. 角色立绘 → 上传 → apply
   2. 封面 → 上传 → apply
   3. 场景 → 上传 → apply
4. **参考图**：用已有立绘作参考，每次生成 **≤3 张**（6 张会被拒）。
5. **大作品**：分批生成，进度（已上传 idx/hash）写进 `progress.md`，中断可续。

## 画面规则

- 场景图：**不要任何文字**（招牌、门匾、书脊、书法），出现就重生成；同时检查现代建筑等穿帮。
- 血腥淡化（例如命案现场只画粉笔轮廓）；**绝不性化未成年人**，涉及未成年人与成人同框时只表现氛围/危险感。
- **封面**：3:4；**必须包含作品标题文字**，放在画面**纵向中部的安全区**，不要贴顶/贴边——作品页 hero 会裁切/遮挡边缘（《越雄关》曾被遮）。确认文字渲染正确，错字/乱码就重生成。
- 所有图片上传前压缩为 **WebP**（长边 ≤1600，quality≈80）。

## 收尾

- 最后一个素材上传后**不要再 claim**：auto-finish 会触发作者通知邮件。
- 调 `finishMediaAssistanceWork`。返回 `notified:false` 可能是邮件已在 auto-finish 时发出——用只读 SELECT 核对 `Games.media_assistance_notified_at`。
- **不要补发/重发邮件。**
- 向人类汇报：张数、暂停项及原因、给作者的剧本问题清单、画面上的已知瑕疵。

## 兜底：claim 流程做不了时（如已收尾作品补封面）

需人类先同意直接改生产数据。

1. 备份 Games 行（JSON），写好 `rollback.sql`。
2. WebP 上传到 R2 桶 `gamebook-assets`（wrangler 可能无 R2 写权限，用 Cloudflare API/MCP）。
3. 同时更新 `Games.cover_image` **和**剧本里的 `cover_image` 行（否则作者保存时会被改回）。
4. 清除新 URL 的缓存（图像缩放会缓存 404）。
5. **此路径不会通知作者，也没有撤回链接**——必须提醒人类决定是否通知作者。
