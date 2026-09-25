TODO
====

- **DSL v2 可选跟进**（Phase 0-3 与 D1 清洗均已完成，见 `docs/DSL_V2_DESIGN.md` 与 WIP.md 归档）：
  - （可选）dream-of-modern-city 的 MBTI 分流场景改写为块级重定向，作为 `->` 语法的官方示范
  - 视觉小说姓名框/立绘 UI 打磨（sites/55，对话行结构化数据已就位）
  - 素材产物 sidecar 化与 i18n：方向设计见 `docs/DSL_V2_DESIGN.md` §8，未排期
- 选项倒计时（基于 DSL v2 的未知子句透传机制实现——`(timer: 10)` 已能原样透传，只需运行时消费）
- 许愿墙
- 修复国际化支持
- 更多的变量展示图标选项
- STT 转写功能实现：目前只有配置（provider + 模型字段），`AiProvider` 接口没有 transcribe 方法、也没有调用路由；做语音输入时要一并补 provider 实现与消费方
- MiMo ASR 模型 ID 待确认：`mimoSttModel` 默认填的是 `mimo-v2.5-asr`，需按官方文档/实际调用核实后订正
- Veo/Sora 视频生成完成后的下载步骤不经过 AI Gateway，仍需真实 `GOOGLE_API_KEY`/`OPENAI_API_KEY`（见 DEV_NOTE「已知缺口」），影响面小但应找方案统一
- MiMo TTS 用真实 key 冒烟验证：协议细节（尤其 `MIMO_VOICES` 预置音色 ID）来自第三方文档交叉核对，官方站点抓不到原始文档，需要实际调用确认无误——已加 `pnpm smoke:mimo-tts`（`packages/asset-generator`）脚本，本地配好 `MIMO_API_KEY` 后跑一下、听感确认 9 个音色（尤其冰糖/茉莉/苏打/白桦这 4 个）互相区分得开即可勾掉本条；这也是按角色分音色有声书功能（见 DEV_NOTE.md「有声书生成」）成立的前提
