import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./StarRating', () => ({
  default: ({ onRate, disabled }: { onRate: (rating: number) => void; disabled?: boolean }) => (
    <button
      data-testid="rate-5"
      disabled={disabled}
      onClick={() => onRate(5)}>
      评 5 星
    </button>
  ),
}));

import GameEndScreen from './GameEndScreen';

const fetchMock = vi.fn<typeof fetch>();

describe('GameEndScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue({ ok: true } as Response);
    localStorage.clear();
    // 只固定 Date.now()，不用 useFakeTimers()——避免和 testing-library 的
    // waitFor 内部轮询用的 setTimeout 打架导致挂起
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-01-01T00:10:00.000Z').getTime());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('初始显示评分组件和跳过按钮', () => {
    render(
      <GameEndScreen
        gameId={1}
        gameStartTime={null}
        onRestart={vi.fn()}
      />,
    );

    expect(screen.getByTestId('rate-5')).toBeInTheDocument();
    expect(screen.getByText('跳过')).toBeInTheDocument();
  });

  it('未同意 GDPR 时评分不发起上报请求，但仍标记为已评分', async () => {
    render(
      <GameEndScreen
        gameId={1}
        gameStartTime={null}
        onRestart={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId('rate-5'));
    await vi.waitFor(() => expect(screen.getByText('谢谢你的阅读！想再看一遍吗？')).toBeInTheDocument());

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('同意 GDPR 后评分会上报 duration 和 rating', async () => {
    localStorage.setItem('analytics_consent', 'accepted');
    render(
      <GameEndScreen
        gameId={7}
        gameStartTime={new Date('2026-01-01T00:00:00.000Z').getTime()}
        onRestart={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId('rate-5'));
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/analytics/complete',
      expect.objectContaining({ body: JSON.stringify({ gameId: 7, duration: 600, rating: 5 }) }),
    );
  });

  it('gameStartTime 为 null 时 duration 记为 0', async () => {
    localStorage.setItem('analytics_consent', 'accepted');
    render(
      <GameEndScreen
        gameId={7}
        gameStartTime={null}
        onRestart={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId('rate-5'));
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/analytics/complete',
      expect.objectContaining({ body: JSON.stringify({ gameId: 7, duration: 0, rating: 5 }) }),
    );
  });

  it('点击跳过：上报不带 rating 字段，且不再显示评分组件', async () => {
    localStorage.setItem('analytics_consent', 'accepted');
    render(
      <GameEndScreen
        gameId={9}
        gameStartTime={new Date('2026-01-01T00:00:00.000Z').getTime()}
        onRestart={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText('跳过'));
    await vi.waitFor(() => expect(screen.queryByTestId('rate-5')).not.toBeInTheDocument());

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/analytics/complete',
      expect.objectContaining({ body: JSON.stringify({ gameId: 9, duration: 600 }) }),
    );
  });

  it('上报请求失败时不抛出异常，依然标记为已评分', async () => {
    localStorage.setItem('analytics_consent', 'accepted');
    fetchMock.mockRejectedValue(new Error('network down'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <GameEndScreen
        gameId={1}
        gameStartTime={null}
        onRestart={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId('rate-5'));

    await vi.waitFor(() => expect(screen.getByText('谢谢你的阅读！想再看一遍吗？')).toBeInTheDocument());
  });

  it('点击"再看一遍"调用 onRestart', () => {
    const onRestart = vi.fn();
    render(
      <GameEndScreen
        gameId={1}
        gameStartTime={null}
        onRestart={onRestart}
      />,
    );

    fireEvent.click(screen.getByText('再看一遍！'));

    expect(onRestart).toHaveBeenCalledTimes(1);
  });
});
