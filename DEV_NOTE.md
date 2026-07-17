开发笔记
====

## 架构演进与技术决策

### 整体架构

**Monorepo + pnpm workspace**
- 决策原因：项目包含 DSL 解析器、Web 应用、素材生成器、独立站点等多个子系统，共享类型定义和核心逻辑
- 结构：`packages/` 存放可复用包（parser、core、app、asset-generator、site-common），`sites/` 存放独立部署站点

**Next.js + Cloudflare Workers（OpenNext）**
- 最初使用标准 Next.js，后迁移到 OpenNext 以部署到 Cloudflare Workers
- 决策原因：Cloudflare 的边缘计算成本低、冷启动快，适合全球分发
- 踩坑：Next.js 版本升级可能破坏 Cloudflare Workers 兼容性，曾降级 Next.js 解决（详见提交 #32）

**D1 数据库（SQLite）+ Drizzle ORM**
- 决策原因：与 Cloudflare Workers 原生集成，零配置、免运维
- 配合 Drizzle ORM 做 schema 管理和迁移
- 限制：无法直接做复杂的关联查询，需要应用层处理

**better-auth 认证**
- 决策原因：轻量、支持邀请制注册，与 Next.js App Router 集成良好
- 当前为邀请制（非开放注册）
- Cookie 跨域通过 `COOKIE_DOMAIN` 环境变量控制

### DSL 设计决策

**Markdown-like 语法**
- 决策原因：降低创作者门槛，Markdown 语法广泛认知
- 基于 Remark/Unified 生态构建解析器，可复用社区插件
- YAML frontmatter 存储元数据

**DSL 演进关键节点**：
1. 初始版本：基本场景、选项、变量
2. 新增 cover prompt 支持（封面图 AI 生成提示词）
3. 简化 parser/stringifier（减少自定义语法，更贴近标准 Markdown）
4. 支持小游戏代码块嵌入

**数据隔离（toPlayableGame）**
- AI 相关字段（prompt、description、style 配置）仅编辑器可见
- 玩家端只看到最终生成的资源 URL 和内容
- 保护创作者的 prompt 不被泄露

### AI 架构决策

**多 Provider 统一抽象**
- 统一 `AiProvider` 接口，支持 Google Gemini 和 OpenAI
- 决策原因：避免供应商锁定，不同任务可选用最优模型
- 工厂函数 `createAiProvider()` 按配置自动选择

**AI Chatbot 操作排序策略**
- 使用 Function Calling 让 AI 精确操作 DSL，而非直接生成文本
- 多操作按优先级排序：添加 → 删除 → 更新
- 操作完成后自动清理无效连线（cleanupInvalidEdges）
- 细粒度操作（如 updateSceneText）优于粗粒度（updateScene），防止 AI 幻觉导致数据丢失

**异步操作系统**
- 视频生成等耗时操作使用 `pending://` 占位符
- 前端每 10 秒轮询检查状态
- 决策原因：Cloudflare Workers 有执行时间限制，长任务必须异步

**每日 AI 用量限制**
- 基于用户维度的每日配额
- 不同操作类型（文本、图片、音频、视频）分别计量

### 状态管理演进

**SWR → TanStack Query**
- 迁移原因：TanStack Query 的缓存策略更灵活，mutation 支持更好
- 编辑器场景需要频繁的乐观更新，TanStack Query 的 mutation + invalidation 模式更适合

**Zustand + Zundo**
- 引入原因：编辑器需要全局状态管理（当前选中场景、编辑状态等）
- Zundo 提供撤销/重做能力，对编辑器是核心需求

### 部署与运维经验

**Next.js + Cloudflare Workers 兼容性**
- OpenNext 桥接 Next.js 到 Cloudflare Workers 运行时
- 部分 Next.js 功能在 Workers 中不可用，需要关注 OpenNext 文档
- 依赖升级后务必测试 Workers 部署

**SEO 实践**
- robots.txt 和 sitemap 需要特殊处理（预渲染）
- IndexNow 主动推送给搜索引擎
- 域名验证文件放在 public 目录

### UI 框架演进

**Radix UI 引入**
- 时机：编辑器功能复杂化后，需要更可靠的无障碍组件
- 使用 Radix Themes 作为基础 UI 库
- 图标最初统一使用 lucide-react，2026-06-28 起改为统一使用 @phosphor-icons/react（packages/app 与 jianjian 已全量迁移；sites/55 在 2026-07 的全盘维护中补齐迁移，全仓库不再有 lucide-react 依赖）

**Radix Themes 移除（2026-07-17，issue #5）**
- 全站实际只用到 Theme/Button/IconButton/DropdownMenu 四种组件，却为此全量加载 812KB（未压缩）styles.css，是 PSI「unused CSS 71KiB」与首页渲染阻塞的主因
- 决策：彻底移除 @radix-ui/themes，按钮统一走 `src/components/Button.tsx`（solid/soft/ghost × 六色 × sm/md/lg，含 iconOnly）；下拉/弹窗/手风琴继续用 @radix-ui/react-* primitives + Tailwind
- 移除后线上 Lighthouse：桌面 56→95、移动 73→96、unused CSS 归零。**不要再引入组件级 CSS 框架**，新按钮场景优先复用共享 Button
- 附带约定：@phosphor-icons/react 已列入 next.config 的 `experimental.optimizePackageImports`（不在 Next 默认清单内）

**爬虫默认语言 = 中文（2026-07-17，issue #5）**
- next-intl 的 locale 解析原本在「无 cookie 且无 Accept-Language」时 fallback 英文，导致 Bingbot 抓到英文正文、与中文 meta/关键词不一致
- 现改为该场景回落 `defaultLocale`（zh），显式带 Accept-Language 的真实浏览器行为不变；改动在 `src/i18n/request.ts`

**MediaAssetItem 统一组件**
- 将封面编辑器和素材编辑器合并
- 决策原因：两者逻辑高度重复（预览、生成、上传），统一后减少维护成本

---

## 独立站点认证架构

独立站点（如 `sites/jianjian`）不直接处理用户认证，而是通过 API 代理将认证请求转发到 CMS（`packages/app`）：

1. **认证流程**：
   - 用户在独立站点访问 `/sign-in` 页面
   - 使用 better-auth 客户端发起登录请求到 `/api/auth/*`
   - 独立站点的 API 代理 (`/api/auth/[...path]/route.ts`) 将请求转发到 CMS
   - CMS 处理认证并设置 Cookie
   - API 代理保留所有响应头（包括 Set-Cookie）返回给客户端

2. **配置要点**：
   - 使用 `NEXT_PUBLIC_API_URL` 环境变量配置 CMS 地址
   - 共享配置统一在 `src/lib/config.ts` 管理
   - Cookie 跨域配置通过 CMS 的 `COOKIE_DOMAIN` 环境变量控制

3. **相关文件**：
   - `/sites/jianjian/src/lib/config.ts` - 共享配置
   - `/sites/jianjian/src/lib/auth-client.ts` - better-auth 客户端配置
   - `/sites/jianjian/src/app/sign-in/page.tsx` - 登录页面
   - `/sites/jianjian/src/app/api/auth/[...path]/route.ts` - 认证 API 代理
   - `/packages/app/src/lib/auth-config.ts` - CMS 认证配置

## 异步操作系统

视频生成等耗时较长的操作使用异步处理模式：

1. **发起请求**：用户发起视频生成请求，系统返回一个占位符 URL（格式：`pending://123`）
2. **操作记录**：在 `PendingOperations` 表中存储操作信息，包括 Google API 的 operation name
3. **前端轮询**：Inspector 组件每 10 秒检查一次占位符状态
4. **完成处理**：当检测到操作完成时，下载视频并上传到 R2，更新数据库，替换占位符为最终 URL

相关文件：
- `/packages/app/migrations/0004_pending_operations.sql` - 数据库迁移
- `/packages/app/src/lib/pending-operations.ts` - 操作管理服务
- `/packages/app/src/app/api/cms/assets/generate-async/route.ts` - 异步生成 API
- `/packages/app/src/app/api/cms/operations/route.ts` - 状态查询 API
- `/packages/app/src/hooks/useAsyncOperation.ts` - 前端轮询 Hook

## 数据隔离

游戏发布后，玩家看到的数据会经过过滤处理（`toPlayableGame` 函数），以下信息不会暴露给玩家：

- 角色的 AI 相关设置（`description`、`image_prompt`）
- 场景中 AI 生成资源的提示词（`prompt`）
- AI 风格配置（`ai.style`）
- 小游戏的生成 prompt 和变量描述

玩家可见的信息：
- 基本元数据（标题、描述、封面、标签）
- 场景内容和选项
- 角色名称和已生成的头像 URL
- 已生成的媒体资源 URL
- 小游戏的 URL 和变量名列表（不含描述）

## 小游戏系统

平台支持在场景中嵌入 AI 生成的小游戏：

1. **生成流程**：作者输入 prompt 描述小游戏规则，AI 生成 JavaScript 代码
2. **存储方式**：生成的代码存储在 `MiniGames` 表中，通过 API 提供
3. **变量交互**：小游戏可以读取和修改指定的游戏变量
4. **场景跳转**：通过选项的条件判断实现根据小游戏结果跳转

相关文件：
- `/packages/app/migrations/0005_mini_games.sql` - 数据库迁移
- `/packages/app/src/app/api/cms/minigames/` - 小游戏 API
- `/packages/app/src/components/game-player/MiniGamePlayer.tsx` - 小游戏播放器
- `/packages/core/lib/ai.ts` - `generateMiniGame` 函数
- `/packages/parser/tests/minigame.test.ts` - DSL 解析测试

### 小游戏 API 规范

```typescript
interface MiniGameAPI {
  init(container: HTMLElement, variables: Record<string, number | string | boolean>): void;
  onComplete(callback: (variables: Record<string, number | string | boolean>) => void): void;
  destroy(): void;
}
```

### 支持的小游戏类型

- 点击类：点击目标、打地鼠
- 记忆类：翻牌配对、记忆序列
- 反应类：快速反应测试
- 收集类：限时收集物品

### `minigame.variables` 的 YAML 形态归一化

DSL 作者（尤其 AI 生成）会把 `变量名: 说明` 的映射误写成列表形式（`- 变量名: 说明`），
两种写法在 `yaml.load` 后分别产出 `Record<string, string>` 和 `Array<Record<string, string>>`，
后者会让下游 `Object.keys()` 拿到数组下标而不是变量名（`toPlayableGame` → `MiniGamePlayer` 传给
小游戏的初始变量因此静默变空对象）。已在 `packages/parser/src/index.ts` 的
`normalizeMiniGameVariables` 统一收敛为 `Record<string, string>`——parser 是唯一数据入口，
下游（`utils.ts`、`MiniGamePlayer.tsx`、`validate-game-script.ts`）不需要也不应该再做防御性判断。

## API 数据格式规范

### CMS 公开 API

CMS 对外提供的 API 遵循以下格式：

| 端点 | 响应格式 |
|------|---------|
| `GET /api/games` | `Game[]` (直接数组) |
| `GET /api/games/:slug` | `Game` (单个对象) |
| `GET /api/games/:slug/play` | `PlayableGame` (单个对象) |

### 子站点调用 API

子站点（如 `sites/jianjian`）通过 HTTP 调用 CMS API 获取数据。调用时注意：

1. **响应格式**：API 直接返回数组或对象，不包裹在 `{ data: ... }` 或类似结构中
2. **错误处理**：需捕获网络错误和 HTTP 错误，返回合理的默认值
3. **缓存策略**：使用 Next.js 的 `revalidate` 配置控制缓存时间

相关文件：
- `/sites/jianjian/src/lib/api.ts` - API 调用封装
- `/sites/jianjian/src/lib/api.test.ts` - API 测试

## AI 上下文自动合并

在编辑器中生成 AI 资源（图片、音频、视频）时，系统会自动将 `ai.style` 和 `ai.characters` 合并到用户 prompt 中：

1. **图片/视频生成**：自动添加 `ai.style.image` + 引用角色的 `image_prompt`
2. **音频生成**：自动添加 `ai.style.audio`

相关文件：
- `/packages/app/src/lib/ai-prompt-builder.ts` - prompt 组装工具
- `/packages/app/tests/lib/ai-prompt-builder.test.ts` - 单元测试

## TTS 语音生成

平台支持为场景文本和选项生成语音：

1. **场景语音**：在 Inspector 中点击"生成语音"按钮
2. **选项语音**：为每个选项单独生成语音

技术实现：
- Google TTS 使用 `gemini-2.5-flash-preview-tts` 模型
- OpenAI TTS 使用 `gpt-4o-mini-tts` 模型
- 音频存储在 R2，Google 输出 WAV，OpenAI 输出 MP3

### 文件扩展名自动修正

`generateAndUploadTTS` 和 `generateAndUploadImage` 函数会根据实际 mimeType 自动修正文件扩展名：

| 来源 mimeType | 输出扩展名 |
|--------------|-----------|
| `audio/pcm` → `audio/wav` | `.wav` |
| `audio/mpeg` | `.mp3` |
| `image/png` | `.png` |
| `image/jpeg` | `.jpg` |
| `image/webp` | `.webp` |

测试文件：`/packages/app/tests/lib/file-extension.test.ts`

### 统一音色配置

所有音色配置集中在 `@mui-gamebook/core/lib/voice-config.ts`：

```typescript
import { GOOGLE_VOICES, OPENAI_VOICES } from '@mui-gamebook/core/lib/voice-config';
```

- **Google**: 30 种音色（含女声、男声）
- **OpenAI**: 13 种音色（含推荐音色 Marin、Cedar）

相关文件：
- `/packages/core/lib/voice-config.ts` - 统一音色配置
- `/packages/app/src/lib/ai-service.ts` - `generateAndUploadTTS` 函数
- `/packages/app/src/app/api/cms/assets/generate-tts/route.ts` - TTS API

## 多 AI Provider 支持

平台支持在 Google AI 和 OpenAI 之间切换：

### 配置切换

在系统设置中可配置 `defaultAiProvider`：
- `google` - 使用 Google Gemini 系列模型
- `openai` - 使用 OpenAI GPT 系列模型

### 统一接口

`@mui-gamebook/core/lib/ai-provider.ts` 定义了统一的 `AiProvider` 接口：

| 方法 | 说明 | 支持 |
|-----|------|------|
| `generateText()` | 文本生成 (支持 reasoning) | Google ✅ / OpenAI ✅ |
| `generateImage()` | 图片生成 | Google ✅ / OpenAI ✅ |
| `chatWithTools()` | Function Calling | Google ✅ / OpenAI ✅ |
| `generateTTS()` | 语音合成 | Google ✅ / OpenAI ✅ |
| `startVideoGeneration()` | 视频生成 | Google ✅ / OpenAI ✅ |
| `generateMiniGame()` | 小游戏生成 | Google ✅ / OpenAI ✅ |

### Reasoning 模式

文本生成支持 `thinking` 选项启用深入思考：

```typescript
const { text } = await provider.generateText(prompt, { thinking: true });
```

- **Google**: 使用 `thinkingConfig.thinkingLevel: 'MEDIUM'`
- **OpenAI**: 使用 `reasoning_effort: 'medium'`（需 GPT-5.1 等支持 reasoning 的模型）

### 工厂函数

使用 `createAiProvider()` 获取当前配置的 provider：

```typescript
import { createAiProvider } from '@/lib/ai-provider-factory';

const provider = await createAiProvider();
const { text } = await provider.generateText('prompt');
```

### 相关文件

- `/packages/core/lib/ai-provider.ts` - 统一接口定义
- `/packages/core/lib/google-ai-provider.ts` - Google 实现
- `/packages/core/lib/openai-provider.ts` - OpenAI 实现
- `/packages/app/src/lib/ai-provider-factory.ts` - 工厂函数


## 管理员 API

提供管理员级别的 API，用于批量操作剧本：

| 端点 | 方法 | 功能 |
|-----|------|------|
| `/api/admin/games/[slug]` | GET | 获取剧本 Markdown 内容 |
| `/api/admin/games/[slug]` | PUT | 更新剧本内容 |

认证方式：`Authorization: Bearer ADMIN_PASSWORD`

相关文件：
- `/packages/app/src/app/api/admin/games/[slug]/route.ts`

## 批量生成工具

`packages/asset-generator` 提供批量生成脚本，用于为剧本批量生成 TTS 语音等资源：

**使用方式：**
```bash
cd packages/asset-generator
pnpm batch --config ./configs/your-config.json [--force]
```

**命令行选项：**
| 选项 | 说明 |
|-----|------|
| `--config` | 配置文件路径（必需） |
| `--force` | 强制重新生成所有素材（忽略已有 URL） |
| `--dry-run` | 只生成和上传，不更新数据库（测试用） |

**配置文件格式：**
```json
{
  "apiUrl": "https://cms.example.com",
  "adminSecret": "xxx",
  "gameSlug": "my-story",
  "tts": {
    "sceneText": true,
    "choices": true
  },
  "format": {
    "audio": "mp3"
  }
}
```

**功能特性：**
- **本地缓存**：生成的素材保存到 `cache/` 目录，避免重复生成
- **跳过已生成**：剧本中已有 URL 的素材跳过
- **格式转换**：远端素材格式不符时自动下载、转换、重新上传
- 支持 WAV 转 MP3（需要系统安装 ffmpeg）
- `ai.style.tts`（语气/语速/情感）目前未被任何 TTS 调用实际读取，是个死配置，尚未修复

相关文件：
- `/packages/asset-generator/src/batch-generate.ts` - 批量生成入口
- `/packages/asset-generator/src/lib/cache.ts` - 本地缓存
- `/packages/asset-generator/src/lib/converter.ts` - 格式转换
- `/packages/asset-generator/configs/example.json` - 配置示例

### 有声书生成：`audiobook` / `audiobook-local`（2026-07）

批量给整本书生成**分角色语音**的有声书，按章节产出 mp3 + 逐句时间戳，动机是 MiMo
TTS 目前免费/促销价，先趁这个窗口批量把存量内容都配好音，同时满足"视觉小说配套有声书、
支持视听同步高亮"这个具体目标（参考 https://muistory.com/play/amulet 这类标题）。
跟上面的 `batch`/`remote`/`local` 命令是并列的独立命令，不是同一套东西：

```bash
pnpm generate audiobook-local demo/little_red_riding_hood.md --segments-only --verbose  # 先零成本预览分段
pnpm generate audiobook my-game-slug                                                     # 确认没问题后正式生成
```

**为什么是独立命令，而不是给 `remote`/`local` 加参数**：这两个命令从头到尾都是"只读"
的——不会调用 `updateGameContent`/写回本地文件。原因是分段/音频结果**不能**写回 DSL 的
节点结构：可视化编辑器（`gameToFlow`/`flowToGame`）会把一个场景的所有文本节点合并成一个
节点保存，如果往节点结构里塞这些数据，下次作者在编辑器里打开保存就会被这个合并逻辑悄悄
冲掉。所以分段/音色/音频全部作为独立于 DSL 的旁路产物，存成一个 manifest JSON
（`audiobook/<slug>/manifest.json`）。

**章节粒度 = 场景（scene），不是更大的分组**：数据模型里没有"章节"概念，只有分支图状的
"场景"。因为剧情会分支，跨多个场景的"章节"分组没有简洁解法（一个分支该算哪一章？），而
"场景"天然对应现有阅读界面"一屏一场景"的渲染方式，所以直接拿场景当章节：每个场景对应
一个完整的 mp3（`audiobook/<slug>/chapters/<sceneId>.mp3`），没有可朗读内容（纯图片、
或整场都是 `{{变量}}` 动态文本）的场景不出现在 manifest 里。

**怎么知道"这句话是谁说的"**：正文里旁白和角色对白只是普通 prose 混在一起（引号 +
"XX说"这类归属短语），没有任何结构化 speaker 字段，只能靠 LLM 阅读理解分段
（`lib/audiobook/segmentation.ts`），不是字符串匹配问题——尤其是角色互相假扮/冒充身份
说话的场景（比如反派冒充另一个角色），必须结合前情提要才能判断真正的说话人。
`manifest-generator.ts` 维护一个 800 字的滚动上下文缓冲区（跨场景累积，仅供参考）来
帮助这类判断，但这只是个启发式兜底，不是图正确性保证——`--segments-only --verbose`
人工抽查分段结果仍然是必要的一道检查。

**分段之后还要按句切分**：说话人分段的粒度是"整段话"，一个旁白段落可能有好几句话。
为了支持"视觉/听觉同步"（音频播放到某一句时前端能高亮对应文字），`sentence-split.ts`
在分段基础上再按中文句末标点做一次纯规则切分（不调用 LLM），每句话独立生成 TTS、
独立记录 cue 时间——这也意味着比只按说话人分段时多出好几倍的 TTS 调用量，是为了拿到
逐句 hook 主动付出的代价，不是 bug。

**章节音频的拼接与计时**：一个场景内所有句子的 wav 片段，按朗读顺序用 ffmpeg 的
concat filter 拼接成一个 wav（`audio-concat.ts` 的 `concatenateWavFiles`，用 filter
而非 concat demuxer 的 `-c copy`，容忍不同音色输出间可能存在的编码参数差异），再转
MP3（复用 `converter.ts` 的 `wavToMp3`）。每句话的精确起止时间来自 `getWavDurationMs`
直接解析各自 WAV 头算出的时长，累加得到 cue 的 `startMs`/`endMs`——没有用 ffprobe（一
章节几十句话没必要每句起一个子进程）。

**两级独立缓存，容易忘记的细节**：分段结果（文本 → `{speaker, text}[]`）按 `content`
的哈希单独缓存，跟逐句音频生成（`句子文本|音色` → wav 字节）的缓存是两回事——改分段
prompt 之后，**音频缓存不会自动失效**，因为它的 key 里根本不含 prompt 版本号。如果
以后改了分段逻辑想让所有书重新分段，只清分段缓存（`cache/<slug>/*-segments-*.json`）
就够了；如果连音色/文本内容也变了，两级缓存都要清（或者直接 `--force`）。**章节级的
拼接/转码/上传每次运行都无条件重做**（不额外维护"整章是否变化"的缓存）——这是本地 CPU
工作 + 一次上传，不是付费/限流资源，为了省这个而加一层缓存不划算。

**音色分配**：旁白固定用 `mimo_default`（或 `game.ai.characters.narrator.voice_name`
覆盖）；角色有显式 `voice_name` 就用，否则按角色 ID 哈希从冰糖/茉莉/苏打/白桦这 4 个
中文预置音色里确定性挑一个（不会用到英文音色，也不会真随机——同一个角色 ID 每次都落
到同一个音色，重跑不会串音色）。

**玩家选项（choice）也配音**：跟屏幕上实际显示的内容保持一致——选项按钮也是"当前屏幕"
的一部分，choice 节点的文本同样走按句切分+TTS，各自的 cue 带上 `nextSceneId`，方便
前端在这句读完后知道可以跳转到哪。choice 节点不做说话人分段（玩家选项文本不是角色台词），
直接当一句 narrator 处理。

**已知边界（明确不做）**：
- `{{变量}}`/条件文本节点直接跳过、不预生成语音（动态文本没法预生成）
- 不做"一键跑全部游戏"的命令，逐本手动跑
- 只产出 manifest + 章节 mp3，**没有消费 manifest 的播放器/前端**——生成和播放是两个
  独立阶段，播放端（读取 cue 时间点驱动高亮/同步）是后续单独的工作
- 章节级产物（拼接后的 mp3、manifest.json）不做增量缓存，每次运行都重新生成/上传

相关文件：
- `/packages/asset-generator/src/lib/audiobook/segmentation.ts` - LLM 说话人分段
- `/packages/asset-generator/src/lib/audiobook/sentence-split.ts` - 按句切分（规则）
- `/packages/asset-generator/src/lib/audiobook/voice-assignment.ts` - 确定性音色分配
- `/packages/asset-generator/src/lib/audiobook/audio-concat.ts` - WAV 时长解析 + ffmpeg 拼接
- `/packages/asset-generator/src/lib/audiobook/manifest-generator.ts` - 编排（分段→切句→TTS→拼接→转码→上传）
- `/packages/asset-generator/src/commands/audiobook.ts`、`audiobook-local.ts`

## MediaAssetItem 统一组件

将封面编辑器和素材编辑器合并为统一的 `MediaAssetItem` 组件：

**组件路径：** `/packages/app/src/components/editor/MediaAssetItem/`

**模块结构：**
| 文件 | 说明 |
|------|------|
| `index.tsx` | 主组件入口 |
| `types.ts` | 类型定义 |
| `TypeIcon.tsx` | 媒体类型图标 |
| `MediaPreview.tsx` | 媒体预览 |
| `MediaGenerator.tsx` | AI 生成表单 |

**使用方式：**

```tsx
// 封面模式（大尺寸，无删除按钮）
<MediaAssetItem
  asset={{ type: 'ai_image', url: coverImage, prompt: '' }}
  gameId={id}
  variant="featured"
  showDelete={false}
  onAssetChange={(field, value) => handleChange(field, value)}
/>

// 素材列表模式（紧凑，可删除）
<MediaAssetItem
  asset={asset}
  gameId={gameId}
  variant="compact"
  showDelete={true}
  onAssetChange={(field, value) => handleChange(field, value)}
  onAssetDelete={() => handleDelete()}
/>
```

**支持的资源类型：**
- 图片（`ai_image`、`static_image`）
- 音频（`ai_audio`、`static_audio`）
- 视频（`ai_video`、`static_video`）
- 小游戏（`minigame`）

相关文件：
- `/packages/app/src/components/editor/AssetEditor.tsx` - 素材列表管理
- `/packages/app/src/components/editor/EditorSettingsTab.tsx` - 使用封面模式

## AI Chatbot 编辑助手

编辑器内置 AI 对话助手，用户可通过自然语言修改剧本内容。

### 架构设计

1. **API 端点**：`/api/cms/games/[id]/chat`
   - 使用 Server-Sent Events (SSE) 流式响应
   - 支持 Function Calling 精确操作 DSL

2. **前端组件**：
   - `ChatPanel/index.tsx` - 聊天面板 UI
   - `ChatPanel/useChatbot.ts` - SSE 流解析和状态管理

3. **操作处理器**：`chatFunctionHandlers.ts`

### 支持的操作函数

| 类别 | 完整操作 | 细粒度操作（推荐） |
|------|----------|-------------------|
| 场景 | `updateScene`, `addScene`, `deleteScene`, `renameScene` | `updateSceneText`, `updateSceneImagePrompt` |
| 选项 | `addChoice`, `updateChoice`, `deleteChoice` | `updateChoiceText`, `updateChoiceTarget`, `updateChoiceCondition` |
| 变量 | `addVariable`, `updateVariable`, `deleteVariable` | — |
| 角色 | `addCharacter`, `updateCharacter`, `deleteCharacter` | — |

**细粒度操作优势**：只修改指定属性，避免 AI 幻觉导致的数据意外覆盖。

### 批量处理和排序

当 AI 返回多个 function calls 时，系统会按优先级排序执行：

1. **添加操作**（优先级 1）：`addScene`, `addChoice`, `addVariable`, `addCharacter`
2. **删除操作**（优先级 2）：`deleteScene`, `deleteChoice`, `deleteVariable`, `deleteCharacter`
3. **更新操作**（优先级 3）：所有 `update*` 和 `rename*` 操作

这确保了操作顺序的正确性，例如先添加新场景再更新它。

### 无效连线清理

所有批量操作执行完成后，系统会自动调用 `cleanupInvalidEdges` 清理：
- 删除指向不存在节点的边
- 删除来源不存在的边

这避免了 AI 幻觉或删除操作导致的悬空连线。

### AI 上下文

每次对话会自动注入：
- 用户原始故事大纲（`backgroundStory`）
- 当前完整 DSL 内容
- 角色定义
- 变量定义

### 相关文件

| 文件 | 说明 |
|------|------|
| `/packages/app/src/app/api/cms/games/[id]/chat/route.ts` | Chat API 和函数声明 |
| `/packages/app/src/components/editor/ChatPanel/` | 聊天组件 |
| `/packages/app/src/lib/editor/chatFunctionHandlers.ts` | 批量处理、排序和清理 |
| `/packages/app/src/lib/editor/handlers/` | 各类操作处理器 |
| `/packages/app/tests/lib/editor/chatFunctionHandlers.test.ts` | 单元测试 |

## 语音配置系统

TTS 语音配置集中管理，支持多 AI 提供者。

### 配置位置

唯一数据源：`/packages/core/lib/voice-config.ts`

App 包通过 re-export 使用：`/packages/app/src/lib/voice-config.ts`

### 支持的提供者

| 提供者 | 音色数量 | 默认音色 |
|--------|----------|----------|
| Google Gemini | 30 | Aoede (女) |
| OpenAI | 13 | marin (男) |

### 主要导出

```typescript
// 获取音色列表
getAvailableVoices(provider: 'google' | 'openai'): VoiceOption[]

// 获取默认音色
getDefaultVoice(provider: 'google' | 'openai'): string

// 验证音色 ID
isValidVoiceId(voiceId: string, provider): boolean
```

### 角色语音预览

编辑器支持为角色生成语音预览：

- API: `/api/cms/games/[id]/generate-voice-preview`
- 组件: `CharacterForm.tsx` 中的语音预览按钮


## AI 提供者分级与按用户权限（2026-07）

### 提供者矩阵

| 提供者 | 能力 | 定位 |
|--------|------|------|
| MiMo（小米） | 文本 + function calling | 普通用户默认，低成本 |
| Claude（Anthropic） | 文本 + function calling | 管理员按用户开通 |
| Google Gemini | 文本/图片/TTS/视频 | 媒体生成主力 |
| OpenAI | 文本/图片/TTS/视频 | 备选 |

- MiMo 走 OpenAI 兼容协议（`MimoProvider extends OpenAiProvider`，自定义 baseURL），默认 Token Plan 订阅地址 `https://token-plan-cn.xiaomimimo.com/v1`（按量付费为 `https://api.xiaomimimo.com/v1`，可在管理后台配置 `mimoBaseUrl` 切换）。不发送 `reasoning_effort` 等 OpenAI 专有参数。**MiMo 官方直连，唯一需要 app 持有真实 key（`MIMO_API_KEY`）的 provider**。
- **Cloudflare AI Gateway（必需）**：Claude/Gemini/OpenAI 的真实密钥存在网关的 BYOK 里（Gateway 控制台 → Provider Keys），app 自身不再持有、不再要求 `GOOGLE_API_KEY`/`OPENAI_API_KEY`/`ANTHROPIC_API_KEY`。`packages/app/src/lib/ai-provider-factory.ts` 用固定占位 key（`AI_GATEWAY_MANAGED_KEY = 'cf-ai-gateway-managed'`）构造 SDK 客户端，真实鉴权由网关完成；SDK base URL 分别指向 `{cfAiGatewayBaseUrl}/anthropic`、`/google-ai-studio`、`/openai`。**必须在管理后台系统配置里填 `cfAiGatewayBaseUrl`，否则这三家调用时直接抛错**（不再有直连官方的回退路径）。
- **网关鉴权（`cf-aig-authorization`）与 BYOK 是两码事**：BYOK 只解决"网关侧存了 provider 的真实密钥"，网关本身若开了 Authenticated Gateway（Cloudflare 官方推荐生产环境启用），每个请求都必须先带 `cf-aig-authorization: Bearer <CF token>` 通过网关这一关的校验，跟 BYOK 配没配无关——不带这个 header 会在到达 provider 之前就被网关 401。已实现：`CF_AI_GATEWAY_TOKEN`（Workers secret，`.dev.vars.example` 有说明，去 Cloudflare Dashboard My Profile → API Tokens 建一个 `AI Gateway - Read` 权限的 token）配置后，`resolveGatewayHeaders()` 会给 Claude/OpenAI SDK 的 `defaultHeaders`、Google GenAI 的 `httpOptions.headers`，以及 Sora/Veo 的裸 fetch 统一加上这个 header；未配置则不发送（对应网关是 Unauthenticated 模式的场景）。
- **已知缺口**：Veo/Sora 视频生成完成后，下载视频文件（`ai-service.ts` 的 `checkAndCompleteVideoGeneration`）是对 Google/OpenAI 存储的直接请求，网关不代理这一步，仍需要真实的 `GOOGLE_API_KEY`/`OPENAI_API_KEY`（走 `process.env`，纯可选，缺失时只影响视频下载，文本/图片/TTS 不受影响）。视频生成本身默认对所有用户关闭，影响面很小。
- Claude 用 `@anthropic-ai/sdk`，默认 `claude-sonnet-5`。**不发送 temperature/top_p**（新模型会 400），`max_tokens` 必填，thinking 用 `{ type: 'adaptive' }`。

### TTS provider 选择独立于文本（2026-07）

- **TTS 不跟随 `defaultAiProvider`**：图片/视频用 `resolveImageVideoProviderType()`（只支持 google/openai，mimo/anthropic 回退 google），TTS 用独立的 `resolveTtsProviderType()`（三选一 google/openai/mimo，读 `config.defaultTtsProvider`，非法值回退 mimo）。两者拆开是因为 MiMo 能做 TTS 但不能做图片/视频——原来共用一个 `resolveMediaProviderType()` 导致"把 TTS 换成 MiMo"这种简单需求，因为文本/TTS/图片/视频全被绑在一个开关上而做不到。
- **默认 TTS provider 是 MiMo**（`defaultTtsProvider: 'mimo'`），因为 Gemini/GPT 的中文语音质量一般。管理后台「系统配置」有独立的「默认 TTS 提供者」下拉，与「默认 AI 提供者」分开。
- MiMo TTS 协议：**不是标准的 `/v1/audio/speech`**，而是复用 `/v1/chat/completions`，目标文本放在 `assistant` 角色消息里（`user` 角色消息可选，用于调整语气），额外带一个 `audio: {format, voice}` 字段；响应在 `choices[0].message.audio.data`（base64）。因为协议形状完全不同，`MimoProvider.generateTTS()` 是手写 `fetch` 而不是复用继承来的 OpenAI SDK `audio.speech.create()`。协议细节来自第三方文档镜像交叉核对（`doc.dmxapi.cn`、`mimo-v2.com`），官方站点是 JS 渲染的 SPA，抓不到原始文档，**上线前务必用真实 key 冒烟验证一遍**（尤其是预置音色 ID 列表，`packages/core/lib/voice-config.ts` 的 `MIMO_VOICES`）。
- 顺手修了两个死配置 bug：`ai-provider-factory.ts` 里 OpenAI/Google 分支之前漏传 `tts` 字段给 provider 构造函数，导致管理后台的「OpenAI TTS 模型」「Google TTS 模型」两个字段改了从来不生效（`GoogleAiProvider.generateTTS` 还硬编码了模型名，没读 `this.models.tts`）。已修复，新加的 `mimoTtsModel` 字段不会重蹈覆辙。
- 删掉了从不生效的 `defaultTtsVoice` 配置字段（同上，从未被任何 TTS 调用读取）；各 provider 的默认音色现在由 `voice-config.ts` 的 `getDefaultVoice(provider)` 按当前 TTS provider 动态派生。

### 按用户权限

- 存储：`user.ai_permissions` 列（JSON：`{providers, canGenerateImage, canGenerateVideo}`），null = 默认权限（仅 MiMo，无生图/生视频）。root 用户（`ROOT_USER_EMAIL`）全开。
- 助手：`packages/app/src/lib/ai-permissions.ts`；管理入口：用户管理编辑弹窗。
- 视频旧 `videoWhitelist`（KV 配置）保留为只读 fallback，等白名单用户权限落库后可删（见 TODO）。
- better-auth 不感知该列（未声明 additionalFields），session shape 不变。

### Secrets 与环境变量

- Workers secrets（`.dev.vars` 本地 / `wrangler secret put` 生产）：`MIMO_API_KEY` 必需；`GOOGLE_API_KEY`/`OPENAI_API_KEY` 仅视频下载需要，可选；其余见 `packages/app/.dev.vars.example`。**不再需要 `ANTHROPIC_API_KEY`**（密钥存在 AI Gateway）。
- Next 构建期变量（`NEXT_PUBLIC_*`）：**必须直接用 `process.env.X` 读取，不能用 `getCloudflareContext().env.X`**——Next 编译器只对 `process.env.NEXT_PUBLIC_*` 做静态字面量替换，替换发生在构建时，Workers 的 `env` 绑定对它完全不起作用（即使 wrangler.jsonc 的 `vars` 里写了同名变量也没用）。本地跑 `pnpm --filter @mui-gamebook/app exec node --experimental-strip-types scripts/setup-local-env.ts` 生成 `.env`（不会覆盖已存在的），或手动 `cp .env.example .env` 填值；`next build`/`opennextjs-cloudflare build` 前必须有值，否则打进产物的就是 `undefined`。清单见 `packages/app/.env.example`。
- `wrangler.jsonc` 的 `vars` 只放真正的 Workers 运行时变量（服务端 `process.env.X` 会被 OpenNext 从 Workers `env` 绑定桥接过去，这是 non-`NEXT_PUBLIC_` 变量能用 `process.env` 读取的原因）；`NEXT_PUBLIC_*` 不要放这里，会误导人以为改它能生效。
- **d.ts 类型（2026-07 修正）**：`packages/app/env.d.ts`（手写 secret 类型补充）已删除；`cloudflare-env.d.ts` 由 `wrangler types`（`pnpm --filter @mui-gamebook/app run cf-typegen`）生成，已从 git 移除、加入 `.gitignore`。secret 的类型来源**不是**本机 `.dev.vars`，而是 `wrangler.jsonc` 里的 `secrets.required` 字段——按 wrangler 官方设计，这个字段"replaces .dev.vars/.env/process.env inference for type generation"，所以任何机器（包括没有 `.dev.vars` 的 CI 构建机）跑 `cf-typegen` 都会生成一致、正确的类型，**不依赖本机 `.dev.vars` 的内容**。新增一个 secret 时，两处都要改：`wrangler secret put <NAME>`（实际值）+ `wrangler.jsonc` 的 `secrets.required` 数组里加上名字（类型声明，不含值，可以放心提交 git）。mdx 模块声明搬到了 `packages/app/src/types/mdx.d.ts`（与 Cloudflare 类型无关，独立保留）。
  - **踩过的坑**：一开始只让 `secrets` 三个字段+MIMO+网关 token 落地，但漏了这条——CI 构建机没有 `.dev.vars`，之前设想"部署前手动跑一次 cf-typegen"完全不成立（人跑的是本机，CI 跑的是它自己的干净环境），导致 `ADMIN_PASSWORD` 这类只在窄类型参数里出现的 secret，在 CI 上因为「传入的 `Cloudflare.Env` 和目标类型没有任何字段重叠」触发 TS 的 weak-type 检测报错。`secrets.required` 才是对的、可移植的修法。
  - **连带的坑**：`vars` 里默认值是单一字面量（如 `HEADLESS_MODE: "false"`、`TRUSTED_ORIGINS: ""`）的字段，wrangler 会把类型推断成那个字面量本身而不是 `string`，导致 `=== 'true'` 或"先真值判断再用"的代码在类型层面出错（真值判断后被收窄成 `never`）。这几处（`app/page.tsx`、`app/my/edit/[id]/page.tsx`、`lib/auth-config.ts`）已经加了 `as string` 显式加宽类型；新增类似的 `vars` 字段、且代码里会跟别的字面量比较或做真值判断时，记得同样处理。
  - **另一个连带的坑**：`NEXT_PUBLIC_SITE_URL`/`NEXT_PUBLIC_GA_ID` 从 `wrangler.jsonc` 的 `vars` 移出去之后（见上一节，它们本该走构建期 `process.env` 而不是 Workers 绑定），`process.env.NEXT_PUBLIC_X` 的类型从"wrangler 认定的非空 string"变回 `@types/node` 的 `string | undefined`，暴露出 `auth-config.ts`、`layout.tsx` 两处从未做空值兜底的地方（`next build` 之前一直"能过"是因为本机 stale 的 d.ts 碰巧还留着旧类型）。已加默认值兜底 / 条件渲染修复。
- **上线硬性顺序**：1) 配置 AI Gateway 并在 `/admin/config` 填 `cfAiGatewayBaseUrl`、`wrangler secret put` 补齐 `wrangler.jsonc` 里 `secrets.required` 列出的所有 secret → 2) `pnpm --filter @mui-gamebook/app run db:migrate:remote`（必须先于 deploy，代码 select 全列）→ 3) deploy（CI/本地跑 `cf-typegen` 都会拿到一致的类型，不需要额外手动步骤）→ 4) 管理员进 `/admin/config` 保存一次（KV 配置是 `{...DEFAULT, ...stored}` 合并，旧存量会盖住新模型默认值）。

### 游戏访问控制

- `packages/app/src/lib/game-access.ts`：`canManageGame`/`getManagedGame`（所有者或 root）。所有 cms 游戏路由统一走它，root 管理员可打开 `/my/edit/[id]` 编辑任意游戏。
- 例外：`register-ip` 保持 owner-only（IP 注册绑定所有者身份）。
- `/api/admin/games/[slug]` 双通道鉴权：ADMIN_PASSWORD Bearer（脚本）或 root session（后台）。

### 大纲导入生成剧本

- 提示词与校验在 `packages/app/src/lib/editor/generate-script.ts`：强制 frontmatter 含 `state`（≥2 变量）与 `ai.characters`（每个具名角色），内嵌可解析示例。
- 服务端生成后用 parser 校验，缺失则一次纠错重生成；示例有守护测试防与 parser 漂移（`tests/lib/editor/generate-script.test.ts`）。

## DSL v2 上线后生产对拍体检（2026-07-16）

- 背景：DSL v2 表达式引擎随 push 自动部署上线（本仓库 commit+push 即部署，运行时切换点在推送时刻，不在手动 deploy）。
- 对 D1 全量 35 个生产游戏做旧求值器（git b78d8ac 版本）vs 新统一引擎对拍：223 条条件、937 条 set、19 个 trigger，各 4 组状态变体。
- 结论：18 处 diff **全部是修复性差异**（旧引擎坏 → 新引擎对），零回归。形态包括：`or`/`||` 条件（旧引擎不识别恒判假）、大写 `AND`（HP4 存量）、条件内算术（`magic_skill + bravery >= 40`）。作者与 AI 早已自然写出这些语法，旧引擎默默判 false 导致相关分支永远不可达，现按作者本意生效。
- 决策依据留档：这验证了 v2 设计原则 P3（语法必须落在 LLM 训练分布内）——引擎应该追上作者的自然写法，而不是反过来。
- 遗留问题已开 issue 跟踪并全部修复：#7 编辑器元数据表单丢字段、#8 中文场景 ID 半支持、#9 编辑器多段语音有损（语音注释内联进编辑文本，2026-07-16）、#10 {{if}} 嵌套（`parser/src/template.ts` 模板树解析器替换单趟正则，校验器改查未配平标签，2026-07-16）。
- D1 生产清洗（2026-07-15）：35 个游戏摸底，10 个清洗落库并逐字节读回校验（3 个旧围栏迁移恢复素材、5 个模板污染清零、2 个老转义产物规范化）。清洗前原始备份：`~/mui-gamebook-d1-backup-2026-07-15.json`。
- 本地 dev D1 留有手测种子游戏 `v2-shou-ce`（id 9001），覆盖对话行/表情/全角标点/中文变量/or 表达式等 v2 语法，可复用于日后手测，不需要可随时删。
