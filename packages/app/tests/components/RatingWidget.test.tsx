import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RatingWidget from '@/components/game-player/RatingWidget';
import messages from '../../src/i18n/messages/en.json';

const { mockSessionState } = vi.hoisted(() => ({
  mockSessionState: { session: null as unknown, isPending: false },
}));

vi.mock('@/lib/auth-client', () => ({
  authClient: { useSession: () => ({ data: mockSessionState.session, isPending: mockSessionState.isPending }) },
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

/** 默认 fetch：GET 返回空均分；POST 按 body 决定：带 content 视配置返回 401 或成功 */
function stubFetch(postWithContent: 'success' | 'loginRequired' = 'success') {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      if (!init?.method || init.method === 'GET') {
        return { ok: true, json: async () => ({ avg: 0, count: 0, ratings: [] }) } as Response;
      }
      const body = JSON.parse(String(init.body)) as { rating: number; content?: string };
      if (body.content && postWithContent === 'loginRequired') {
        return { ok: false, status: 401, json: async () => ({ error: 'LOGIN_REQUIRED' }) } as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ success: true, avg: body.rating, count: 1, myRating: body.rating }),
      } as Response;
    }),
  );
}

describe('RatingWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    mockSessionState.session = null;
    mockSessionState.isPending = false;
    stubFetch();
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

  it('匿名写评价遇 401 时存草稿并提示去登录（带跳回）', async () => {
    stubFetch('loginRequired');
    renderWidget();
    fireEvent.click(screen.getAllByRole('radio')[4]);
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText(/Share your thoughts/), { target: { value: '神作，哭了' } });
    fireEvent.click(screen.getByText('Submit review'));

    await waitFor(() => expect(screen.getByText('Sign in to write a review')).toBeInTheDocument());
    // 草稿落盘
    const draft = JSON.parse(window.localStorage.getItem('game-review-draft:g') ?? 'null') as {
      rating: number;
      content: string;
    } | null;
    expect(draft).toMatchObject({ rating: 5, content: '神作，哭了' });
    // 去登录带跳回
    const loginLink = screen.getByRole('link', { name: 'Sign in' });
    expect(loginLink.getAttribute('href')).toBe('/sign-in?redirect=%2Fplay%2Fg');
  });

  it('登录回来后草稿自动提交并清掉', async () => {
    window.localStorage.setItem('game-rating:g', '5');
    window.localStorage.setItem(
      'game-review-draft:g',
      JSON.stringify({ rating: 5, content: '神作，哭了', updatedAt: Date.now() }),
    );
    mockSessionState.session = { user: { id: 'u-1' } };
    renderWidget();

    // 自动 POST（rating + content）并显示恢复提示
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        '/api/games/g/ratings',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ rating: 5, content: '神作，哭了' }),
        }),
      ),
    );
    await waitFor(() =>
      expect(screen.getByText('Your pre-login review was submitted automatically, thanks!')).toBeInTheDocument(),
    );
    expect(window.localStorage.getItem('game-review-draft:g')).toBeNull();
  });

  it('没登录回来则自动打开留言框并回填草稿', async () => {
    window.localStorage.setItem('game-rating:g', '5');
    window.localStorage.setItem(
      'game-review-draft:g',
      JSON.stringify({ rating: 5, content: '神作，哭了', updatedAt: Date.now() }),
    );
    renderWidget();

    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    expect(screen.getByDisplayValue('神作，哭了')).toBeInTheDocument();
  });
});
