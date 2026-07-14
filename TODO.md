TODO
====

- 选项倒计时
- 许愿墙
- 游戏地图推广到 `packages/app`（主站）和 `sites/jianjian`：功能本体（`use-route-map.ts`）已在 `site-common` 实现，目前只有 `sites/55`（`RouteMapScreen.tsx`）接了 UI，另外两个站点还没有对应入口
- 修复国际化支持
- 更多的变量展示图标选项
- 移除 `videoWhitelist` 过渡期 fallback（先在用户管理里给白名单用户勾上视频权限）
- `recordAiUsage` 的 model 字段存真实模型 ID（现存 provider.type，四个 provider 后统计偏粗）
- 编辑器根据 `canGenerateImage` 隐藏/禁用生图按钮（现靠服务端 403 + 弹窗兜底）
- Veo/Sora 视频生成完成后的下载步骤不经过 AI Gateway，仍需真实 `GOOGLE_API_KEY`/`OPENAI_API_KEY`（见 DEV_NOTE「已知缺口」），影响面小但应找方案统一
- MiMo TTS 用真实 key 冒烟验证：协议细节（尤其 `MIMO_VOICES` 预置音色 ID）来自第三方文档交叉核对，官方站点抓不到原始文档，需要实际调用确认无误——已加 `pnpm smoke:mimo-tts`（`packages/asset-generator`）脚本，本地配好 `MIMO_API_KEY` 后跑一下、听感确认 9 个音色（尤其冰糖/茉莉/苏打/白桦这 4 个）互相区分得开即可勾掉本条；这也是按角色分音色有声书功能（见 DEV_NOTE.md「有声书生成」）成立的前提
- `usage-limit.ts` 的 `incrementUserDailyUsage` 是非原子的"读→改→写"，并发请求下计数可能丢失、被绕过每日限额（Phase 7 批次 1 已用测试锁定这个现状，真正修复需要改成 D1 原子 UPDATE 或 Durable Object 计数器，属于架构改动）

