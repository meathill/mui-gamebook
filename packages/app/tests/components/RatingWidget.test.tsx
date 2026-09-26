import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RatingWidget from '@/components/game-player/RatingWidget';
import messages from '../../src/i18n/messages/en.json';

vi.mock('@/lib/auth-client', () => ({
  authClient: { useSession: vi.fn(() => ({ data: null })) },
}));

function renderWidget(props: { slug?: string; initialAvg?: number; initialCount?: number } = {}) {
  return render(
    <NextIntlClientProvider
      messages={messages}
      locale="en">
      <RatingWidget slug={props.slug ?? 'g'} />
    </NextIntlClientProvider>,
  );
}

describe('RatingWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        if (!init?.method || init.method === 'GET') {
          return { ok: true, json: async () => ({ avg: 0, count: 0, ratings: [] }) } as Response;
        }
        return { ok: true, json: async () => ({ success: true, avg: 5, count: 1, myRating: 5 }) } as Response;
      }),
    );
  });

  it('渲染打分标题与 5 颗星', async () => {
    renderWidget();

    expect(screen.getByText('Rate this story')).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(5);
    await waitFor(() => expect(fetch).toHaveBeenCalled());
  });

  it('点星后 POST 打分并弹出留言框', async () => {
    renderWidget();

    fireEvent.click(screen.getAllByRole('radio')[4]);

    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    expect(fetch).toHaveBeenCalledWith('/api/games/g/ratings', expect.objectContaining({ method: 'POST' }));
    expect(screen.getAllByText(/You rated 5 stars/)).toHaveLength(2); // 打分区 + 留言框各一处
  });

  it('本浏览器已评过则只读展示，不再投票', async () => {
    window.localStorage.setItem('game-rating:g', '4');
    renderWidget();

    await waitFor(() => expect(screen.getByText(/You rated 4 stars/)).toBeInTheDocument());
    fireEvent.click(screen.getAllByRole('radio')[4]);

    // 只读：除了初始 GET 外没有 POST
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('提交空评价直接关闭（跳过）', async () => {
    renderWidget();
    fireEvent.click(screen.getAllByRole('radio')[4]);
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Skip'));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
