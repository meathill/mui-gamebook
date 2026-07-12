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

覆盖较好的部分：
- DSL 解析器（`packages/parser`）
- `site-common` 的游戏播放核心 hooks（`use-game-player`/`use-save-system`/`use-route-map`/`use-game-controls`/`use-game-settings`/`use-sfx`）
- AI provider 实现：`claude`/`mimo` 有专属测试且较完整，`openai` 有专属测试但较薄；`google`（`packages/core/lib/google-ai-provider.ts`，四者中最大的实现）**没有专属测试文件**，只在网关相关测试里被间接触及一小部分逻辑，是四者中风险最高的一个

覆盖有明显缺口，属于长期待补的部分：
- 大部分 API route（`packages/app/src/app/**/route.ts`，38 个里约九成零覆盖）
- 多数 UI 组件，尤其编辑器核心组件（`RichEditor`/`VisualEditor`/`Inspector`/`ChatPanel` 等）
- **编辑器核心业务逻辑** `packages/app/src/lib/editor/handlers/`（choice/scene/character/variable 四类 DSL 操作，编辑器最核心的部分）
- 认证（`auth-server.ts`/`auth-config.ts`）与 Story Protocol 相关逻辑
- `packages/app/src/components/admin/`
- `packages/cms`、`packages/cronjob`（均为整包零覆盖）、`sites/55` 的大部分代码

这些缺口不追求一次性补齐，按优先级（核心播放逻辑 > 高风险 lib > API route > 组件）分批推进即可，当前进度见 `WIP.md`。
