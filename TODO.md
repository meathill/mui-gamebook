TODO
====

- 选项倒计时
- 许愿墙
- 游戏地图，显示所有已探索的区域，用户可以在可以选择不同的分支进行游戏
- 修复国际化支持
- 更多的变量展示图标选项
- 移除 `videoWhitelist` 过渡期 fallback（先在用户管理里给白名单用户勾上视频权限）
- `recordAiUsage` 的 model 字段存真实模型 ID（现存 provider.type，四个 provider 后统计偏粗）
- 编辑器根据 `canGenerateImage` 隐藏/禁用生图按钮（现靠服务端 403 + 弹窗兜底）
- Veo/Sora 视频生成完成后的下载步骤不经过 AI Gateway，仍需真实 `GOOGLE_API_KEY`/`OPENAI_API_KEY`（见 DEV_NOTE「已知缺口」），影响面小但应找方案统一
- MiMo TTS 用真实 key 冒烟验证：协议细节（尤其 `MIMO_VOICES` 预置音色 ID）来自第三方文档交叉核对，官方站点抓不到原始文档，需要实际调用确认无误

