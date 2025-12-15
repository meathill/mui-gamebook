# 创建新站点指南

本文档介绍如何基于 `@mui-gamebook/site-common` 快速创建面向特定用户群体的前端站点。

## 快速开始

### 1. 创建站点目录

```bash
mkdir -p sites/your-site-name/src/{app,components,lib}
```

### 2. 复制配置文件

从 `sites/jianjian` 复制以下文件并修改：

| 文件 | 必须修改的内容 |
|------|---------------|
| `package.json` | `name` 字段 |
| `next.config.ts` | 根据需要调整 |
| `open-next.config.ts` | 通常无需修改 |
| `wrangler.jsonc` | `name`、KV/R2 资源 ID、环境变量 |
| `tsconfig.json` | 通常无需修改 |
| `postcss.config.mjs` | 通常无需修改 |
| `.gitignore` | 通常无需修改 |

### 3. 添加依赖

在 `package.json` 中添加共享模块依赖：

```json
{
  "dependencies": {
    "@mui-gamebook/site-common": "workspace:*",
    "@mui-gamebook/parser": "workspace:*"
  }
}
```

### 4. 创建页面

#### 布局 (src/app/layout.tsx)

```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '你的站点名称',
  description: '站点描述',
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh">
      <body>{children}</body>
    </html>
  );
}
```

#### 首页 (src/app/page.tsx)

```tsx
import { createApiClient } from '@mui-gamebook/site-common/api';

const api = createApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3020',
});

export default async function Home() {
  const games = await api.getGames();
  
  return (
    <div>
      {games.map(game => (
        <a href={`/play/${game.slug}`} key={game.slug}>
          {game.title}
        </a>
      ))}
    </div>
  );
}
```

#### 游戏页 (src/app/play/[slug]/page.tsx)

```tsx
import { createApiClient } from '@mui-gamebook/site-common/api';
import GamePlayer from './GamePlayer';

const api = createApiClient({ baseUrl: '...' });

export default async function PlayPage({ params }) {
  const { slug } = await params;
  const playableGame = await api.getPlayableGame(slug);
  
  return <GamePlayer game={playableGame} slug={slug} />;
}
```

#### 游戏播放器组件 (src/app/play/[slug]/GamePlayer.tsx)

```tsx
'use client';

import { useGamePlayer, evaluateCondition, interpolateVariables } from '@mui-gamebook/site-common/game-player';

export default function GamePlayer({ game, slug }) {
  const {
    isLoaded,
    isGameStarted,
    currentScene,
    runtimeState,
    visibleVariables,
    showEndScreen,
    handleStartGame,
    handleRestart,
    handleChoice,
  } = useGamePlayer(game, slug, {
    storagePrefix: 'your_site', // 自定义存储前缀
  });

  if (!isLoaded) return <div>加载中...</div>;
  if (!isGameStarted) return <button onClick={handleStartGame}>开始</button>;

  return (
    <div>
      {currentScene?.nodes.map((node, i) => {
        if (node.type === 'text') {
          return <p key={i}>{interpolateVariables(node.content, runtimeState)}</p>;
        }
        if (node.type === 'choice' && evaluateCondition(node.condition, runtimeState)) {
          return (
            <button key={i} onClick={() => handleChoice(node.nextSceneId, node.set)}>
              {interpolateVariables(node.text, runtimeState)}
            </button>
          );
        }
        return null;
      })}
      {showEndScreen && <button onClick={() => handleRestart(true)}>重新开始</button>}
    </div>
  );
}
```

### 5. 自定义样式

在 `src/app/globals.css` 中定义站点主题：

```css
@import "tailwindcss";

:root {
  --background: #ffffff;
  --foreground: #171717;
  --primary: #your-color;
}
```

### 6. 安装和运行

```bash
# 根目录执行
pnpm install

# 启动开发服务器
cd sites/your-site-name
pnpm dev
```

## 可复用功能

| 模块 | 导入路径 | 说明 |
|------|----------|------|
| API 客户端 | `@mui-gamebook/site-common/api` | 获取游戏列表和详情 |
| 游戏播放器 Hook | `@mui-gamebook/site-common/game-player` | 状态管理和游戏逻辑 |
| 工具函数 | `@mui-gamebook/site-common/utils` | 条件评估、变量插值 |
| 站点配置 | `@mui-gamebook/site-common/components` | 配置管理工具 |

## 部署

```bash
cd sites/your-site-name
pnpm deploy
```

首次部署前需要：
1. 在 Cloudflare 创建 KV namespace 和 R2 bucket
2. 更新 `wrangler.jsonc` 中的资源 ID
3. 配置自定义域名
