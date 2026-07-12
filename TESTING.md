# TESTING

## 测试框架

- [Vitest](https://vitest.dev/) 4.x，`jsdom` 环境
- 配置统一放在仓库根目录：
  - `vitest.config.ts` — 管理整个 monorepo 的测试，`include` 覆盖两种目录模式：
    - `packages/*/tests/**/*.{test,spec}.{ts,tsx}`（packages 下用独立的 `tests/` 目录）
    - `sites/*/src/**/*.{test,spec}.{ts,tsx}`（sites 下测试与源文件同目录内联）
  - `vitest.setup.ts` — 全局 setup，mock `localStorage`、引入 `@testing-library/jest-dom`
- `packages/app` 额外有自己的 `vitest.config.ts`（需要 `@` → `src` 的别名和 jsdom 插件），可以在包内单独跑测试；其余包/站点都依赖根配置

## 运行测试

```bash
pnpm test          # 跑全部测试（必须在仓库根目录执行）
pnpm test:ui       # 带 UI 界面
npx vitest run <path>   # 只跑某个文件，同样要在仓库根目录执行
```

不要在子包目录里直接跑 `pnpm test`——多数子包没有自己的 `test` 脚本（`packages/app` 除外），统一由根目录的 vitest 通过 `include` 规则发现所有测试文件。

## 类型检查

```bash
pnpm run typecheck   # 聚合跑所有 workspace 包各自的 tsc --noEmit
```

也可以单独跑某个包：`pnpm --filter <package-name> run typecheck`。

**`packages/app` 的 typecheck 依赖 `cloudflare-env.d.ts`**（wrangler 生成的 Cloudflare 绑定类型声明）。这个文件按约定不提交到仓库、也不由 CI 管理，需要时在 `packages/app` 目录下本地生成：

```bash
pnpm run cf-typegen
```

没生成过这个文件时，`packages/app` 的 typecheck 会报出大量 `Property 'DB'/'KV'/... does not exist on type 'CloudflareEnv'` 之类的错误——这不是真实的类型问题，只是绑定类型还没生成。

typecheck 目前**没有接入 CI**，只作为本地开发工具使用。

## 编写测试的约定

- 测试文件与源码文件同名，加 `.test.ts` / `.test.tsx` 后缀
- `packages/*` 下测试放在包内的 `tests/` 目录，实际约定并不统一：`tests/lib/**` 镜像 `src/lib/**`（或 `lib/**`）的子目录结构（如 `tests/lib/editor/extensions/`）；但 `tests/components/**`、`tests/hooks/**`、`tests/api/**` 是**打平存放**——不管源文件在 `src/components/` 下哪个子目录，测试文件一律直接放这三个目录下一层（例：`src/components/editor/SceneMetadataBlock.tsx` 的测试是 `tests/components/SceneMetadataBlock.test.tsx`，没有 `editor/` 子目录）。写新测试前先看这三个目录下现有文件的实际摆放方式，不要凭直觉镜像 `src/` 结构
- `sites/*` 下测试与源文件同目录内联——因为根 `vitest.config.ts` 的 `@` 别名只指向 `packages/app/src`，`sites/*` 下的文件如果用 `@/...` 会解析失败；内联测试改用相对路径 import 可以规避这个问题
- Hook 测试用 `@testing-library/react` 的 `renderHook`/`act`；组件测试用 `render`/`screen`/`fireEvent`
- 涉及 React state 的 hook 测试要注意：传给 hook 的引用类型参数（比如 `game` 对象）必须在 `renderHook` 回调之外构造成稳定引用，如果每次渲染都重新构造，可能因为 effect 依赖数组识别为"变化"而导致无限渲染循环
- jsdom 没有实现的浏览器 API 需要手动 mock，仓库里已有可参考的例子：
  - `Element.scrollTo` / `window.scrollTo`
  - `AudioContext`（`useSfx`/`useAudioPlayer` 相关测试）
  - 打字机效果的 `setTimeout` 时序，配合 `vi.useFakeTimers()`

## 覆盖现状（如实记录，不是目标）

2026-07 完成了一轮大规模测试覆盖补齐（Phase 7，按认证/计费/链上 > 核心业务逻辑 > UI 组件 > 边缘代码的优先级分批推进，过程记录已从 `WIP.md` 清空）。目前覆盖较完整的部分：

- DSL 解析器（`packages/parser`）
- `site-common` 的游戏播放核心 hooks（`use-game-player`/`use-save-system`/`use-route-map`/`use-game-controls`/`use-game-settings`/`use-sfx`）
- 四个 AI provider（`claude`/`mimo`/`openai`/`google`）均有专属测试
- 认证与计费核心 lib（`usage-limit.ts`/`ai-usage.ts`/`auth-server.ts`/`auth-config.ts`）
- `packages/app/src/app/api/**/route.ts` 绝大部分 route（AI 生成计费闭环、Story Protocol 注册、其余 CRUD/代理类 route）
- 编辑器核心业务逻辑 `packages/app/src/lib/editor/handlers/`，以及编辑器 UI 组件（`RichEditor`/`VisualEditor`/`Inspector`/`ChatPanel` 等）
- `packages/app/src/components/admin/`、`game-player/`，`packages/cronjob`
- `sites/55`、`sites/jianjian` 的组件层和数据/逻辑层

明确不测的部分（结构性障碍或纯展示，非遗漏）：
- Next.js `page.tsx`/`layout.tsx` 里用 `async function` 声明的 Server Component——React DOM 的客户端渲染器不支持 async 函数组件，`@testing-library/react` 的 `render()` 无法调用，需要真实浏览器/RSC 渲染管线才能测
- `StandaloneMiniGamePlayer.tsx` 通过 Blob + 动态 `import(blobUrl)` 加载小游戏模块，Node/jsdom 的模块加载器不支持 `blob:` scheme，"加载成功"和"游戏完成"分支不可达
- `story-protocol.ts` 的 `createStoryClient`/`getIpInfo` 在函数体内直接 `new` 出 viem/Story Protocol SDK 对象且依赖真实网络请求；上线前仍需在测试网跑一次真实注册，测试无法替代
- `packages/cms` 的 Payload 声明式配置（collections 均为纯字段声明，无自定义 `hooks`/`access`/`validate`）、`app/(payload)/**` admin 面板样板代码
- 纯静态展示组件（无 props、无条件渲染、无状态），如 `components/home/*`、jianjian 的 `Header.tsx`/`Footer.tsx`/隐私政策与服务条款页
- 已确认零引用的死代码（如曾经的 `packages/app/src/lib/auth.ts`，已删除）；`GameSettings.tsx` 已确认死代码但受权限限制未删除，暂时也未补测试

已知但不修复、记入 `TODO.md` 的问题：
- `usage-limit.ts` 的 `incrementUserDailyUsage` 并发下非原子读改写，计数可能丢失（需要 D1 原子 UPDATE 或 Durable Object，架构改动，测试只做了特征化测试锁定现状）
