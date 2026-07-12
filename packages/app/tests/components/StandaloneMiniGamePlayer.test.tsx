import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import StandaloneMiniGamePlayer from '@/components/game-player/StandaloneMiniGamePlayer';

// 该组件通过 Blob + 动态 import(blobUrl) 加载小游戏模块，这是纯浏览器运行时机制：
// Node/jsdom 的模块加载器不支持 blob: scheme（`import('blob:...')` 恒定抛出
// "Cannot find package"），因此"加载成功"和"游戏完成"两条分支在当前测试环境下
// 结构性不可达，与批次 3 中 Story Protocol SDK 的处理原则一致：只测能触达的部分，
// 不为了凑覆盖率强行深度 mock 模块加载器。这里覆盖：初始门禁、code 为空的校验、
// 加载失败后的错误视图与重试按钮。
describe('StandaloneMiniGamePlayer', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('初始显示"开始游戏"门禁，不加载任何内容', () => {
    render(<StandaloneMiniGamePlayer code="export default {}" />);

    expect(screen.getByText('准备好开始小游戏了吗？')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '开始游戏' })).toBeInTheDocument();
  });

  it('code 为空时点击开始显示配置缺失错误，不尝试创建 Blob', () => {
    render(<StandaloneMiniGamePlayer code="" />);

    fireEvent.click(screen.getByRole('button', { name: '开始游戏' }));

    expect(screen.getByText('小游戏加载失败')).toBeInTheDocument();
    expect(screen.getByText('小游戏代码未配置')).toBeInTheDocument();
  });

  it('code 非空时点击开始，因当前环境无法真正加载模块而进入错误视图（附重试按钮）', async () => {
    render(<StandaloneMiniGamePlayer code="export default { init(){}, onComplete(){}, destroy(){} };" />);

    fireEvent.click(screen.getByRole('button', { name: '开始游戏' }));

    expect(await screen.findByText('小游戏加载失败')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /重试/ })).toBeInTheDocument();
  });

  it('点击重试会重新尝试加载（仍然失败，但不会崩溃且保持在错误视图）', async () => {
    render(<StandaloneMiniGamePlayer code="export default { init(){}, onComplete(){}, destroy(){} };" />);
    fireEvent.click(screen.getByRole('button', { name: '开始游戏' }));
    await screen.findByText('小游戏加载失败');

    fireEvent.click(screen.getByRole('button', { name: /重试/ }));

    expect(await screen.findByText('小游戏加载失败')).toBeInTheDocument();
  });
});
