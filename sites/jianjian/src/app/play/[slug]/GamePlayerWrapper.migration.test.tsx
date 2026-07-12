/**
 * GamePlayerWrapper 迁移回归测试
 *
 * 背景：useGameState 从"本地手写实现 + 本地 evaluator"迁移为组合
 * site-common 的 useGamePlayer + 共享 evaluator。这份测试覆盖迁移
 * 关心的两件事：
 * 1. 迁移后 jianjian 新获得的能力（多条件 AND、{{if}}...{{else}}...{{/if}} 块插值）
 *    通过真实组件树能够正确渲染，而不只是 site-common 内部单测通过。
 * 2. 迁移前保存的 localStorage 存档（key 仍是 jianjian_game_${slug}）在迁移后
 *    依然可以被正确读取续玩，不会因为改用 site-common 的 useGamePlayer 而失效。
 */
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { PlayableGame } from '@mui-gamebook/parser/src/types';
import GamePlayerWrapper from './GamePlayerWrapper';

function makeGame(): PlayableGame {
  return {
    slug: 'demo',
    title: '测试故事',
    initialState: {
      gold: 0,
      has_key: false,
    },
    scenes: {
      start: {
        id: 'start',
        nodes: [
          { type: 'text', content: '你有 {{gold}} 金币。' },
          { type: 'choice', text: '拿钥匙并留下金币', nextSceneId: 'forest', set: 'gold = gold + 5, has_key = true' },
          { type: 'choice', text: '什么都不拿', nextSceneId: 'forest' },
        ],
      },
      forest: {
        id: 'forest',
        nodes: [
          {
            type: 'text',
            content: '{{if gold >= 5 && has_key}}你带着钥匙和金币走进森林。{{else}}你空手走进森林。{{/if}}',
          },
        ],
      },
    },
    startSceneId: 'start',
  };
}

describe('GamePlayerWrapper（jianjian，迁移至 site-common 后）', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('拿钥匙分支：多条件 AND 与 if 块渲染出"带钥匙"文案', async () => {
    const game = makeGame();
    render(
      <GamePlayerWrapper
        game={game}
        gameId={1}
        slug="demo-and-true"
      />,
    );

    fireEvent.click(await screen.findByText('开始冒险！'));
    fireEvent.click(await screen.findByText(/拿钥匙并留下金币/));

    expect(await screen.findByText('你带着钥匙和金币走进森林。')).toBeInTheDocument();
  });

  it('不拿钥匙分支：AND 条件不成立时走 else 分支', async () => {
    const game = makeGame();
    render(
      <GamePlayerWrapper
        game={game}
        gameId={1}
        slug="demo-and-false"
      />,
    );

    fireEvent.click(await screen.findByText('开始冒险！'));
    fireEvent.click(await screen.findByText(/什么都不拿/));

    expect(await screen.findByText('你空手走进森林。')).toBeInTheDocument();
  });

  it('变量插值正确显示当前金币数', async () => {
    const game = makeGame();
    render(
      <GamePlayerWrapper
        game={game}
        gameId={1}
        slug="demo-interpolate"
      />,
    );

    fireEvent.click(await screen.findByText('开始冒险！'));

    expect(await screen.findByText('你有 0 金币。')).toBeInTheDocument();
  });

  it('迁移前保存的旧格式存档（key: jianjian_game_${slug}）在迁移后依然能被读取续玩', async () => {
    const game = makeGame();
    const slug = 'demo-legacy-save';
    // 模拟迁移前（本地手写 useGameState）写入的存档格式
    localStorage.setItem(
      `jianjian_game_${slug}`,
      JSON.stringify({
        sceneId: 'forest',
        state: { gold: 5, has_key: true },
        imageUrl: undefined,
        startTime: 1700000000000,
        scenes: ['start', 'forest'],
      }),
    );

    render(
      <GamePlayerWrapper
        game={game}
        gameId={1}
        slug={slug}
      />,
    );

    // 存档里 sceneId 是 forest 且已 isGameStarted，应直接渲染 forest 场景内容，跳过开始画面
    await waitFor(() => expect(screen.queryByText('开始冒险！')).not.toBeInTheDocument());
    expect(await screen.findByText('你带着钥匙和金币走进森林。')).toBeInTheDocument();
  });
});
