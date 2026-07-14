import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Game } from '@mui-gamebook/parser/src/types';
import AudiobookGenerationCard from '@/components/editor/AudiobookGenerationCard';

const fetchMock = vi.fn<typeof fetch>();

function makeGame(sceneIds: string[]): Game {
  return {
    slug: 'test-game',
    title: 'Test Game',
    initialState: {},
    ai: {},
    scenes: Object.fromEntries(sceneIds.map((id) => [id, { id, nodes: [] }])),
  };
}

function okResponse(body: unknown = {}) {
  return { ok: true, json: () => Promise.resolve(body) } as Response;
}

function errorResponse(status: number, body: unknown = { error: '出错了' }) {
  return { ok: false, status, json: () => Promise.resolve(body) } as Response;
}

/** status 接口返回 generatedSceneIds，generate-scene 接口按 postImpl 处理每个 sceneId */
function mockFetch(
  generatedSceneIds: string[],
  postImpl: (sceneId: string) => Promise<Response> = async () => okResponse(),
) {
  fetchMock.mockImplementation((url, opts) => {
    if ((url as string).endsWith('/audiobook/status')) {
      return Promise.resolve(okResponse({ generatedSceneIds }));
    }
    const body = JSON.parse((opts?.body as string) ?? '{}') as { sceneId: string };
    return postImpl(body.sceneId);
  });
}

function postCalls() {
  return fetchMock.mock.calls.filter(([, opts]) => (opts as RequestInit | undefined)?.method === 'POST');
}

describe('AudiobookGenerationCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('打开弹窗后查询已生成场景状态，展示总场景数', async () => {
    mockFetch([]);

    render(
      <AudiobookGenerationCard
        gameId="1"
        game={makeGame(['start', 'end'])}
      />,
    );
    fireEvent.click(screen.getByText('一键生成有声书'));

    await vi.waitFor(() => expect(screen.getByText(/0 \/ 2 个场景已生成/)).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith('/api/cms/games/1/audiobook/status');
  });

  it('从未生成过时，点击开始生成后按场景顺序依次调用接口，全部成功后显示完成状态', async () => {
    mockFetch([]);

    render(
      <AudiobookGenerationCard
        gameId="1"
        game={makeGame(['start', 'end'])}
      />,
    );
    fireEvent.click(screen.getByText('一键生成有声书'));
    await vi.waitFor(() => expect(screen.getByText(/0 \/ 2 个场景已生成/)).toBeInTheDocument());
    fireEvent.click(screen.getByText('开始生成'));

    await vi.waitFor(() => expect(screen.getByText(/2 \/ 2 个场景已生成/)).toBeInTheDocument());

    const calls = postCalls();
    expect(calls).toHaveLength(2);
    expect(calls[0]).toEqual([
      '/api/cms/games/1/audiobook/generate-scene',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ sceneId: 'start' }) }),
    ]);
    expect(calls[1]).toEqual([
      '/api/cms/games/1/audiobook/generate-scene',
      expect.objectContaining({ body: JSON.stringify({ sceneId: 'end' }) }),
    ]);
  });

  it('已有部分场景生成过时，只处理剩余场景（增量/断点续跑）', async () => {
    mockFetch(['start']);

    render(
      <AudiobookGenerationCard
        gameId="1"
        game={makeGame(['start', 'end', 'third'])}
      />,
    );
    fireEvent.click(screen.getByText('一键生成有声书'));

    await vi.waitFor(() => expect(screen.getByText(/1 \/ 3 个场景已生成/)).toBeInTheDocument());
    fireEvent.click(screen.getByText('继续生成剩余 2 个'));

    await vi.waitFor(() => expect(screen.getByText(/3 \/ 3 个场景已生成/)).toBeInTheDocument());

    // 已生成的 start 不应该被重新调用，只处理 end 和 third
    const calls = postCalls();
    expect(calls).toHaveLength(2);
    expect(calls.map(([, opts]) => JSON.parse((opts as RequestInit).body as string).sceneId)).toEqual(['end', 'third']);
  });

  it('全部场景都生成过时，开始按钮禁用', async () => {
    mockFetch(['start', 'end']);

    render(
      <AudiobookGenerationCard
        gameId="1"
        game={makeGame(['start', 'end'])}
      />,
    );
    fireEvent.click(screen.getByText('一键生成有声书'));

    await vi.waitFor(() => expect(screen.getByText(/2 \/ 2 个场景已生成/)).toBeInTheDocument());
    expect(screen.getByText(/继续生成剩余 0 个/)).toBeDisabled();
  });

  it('某个场景失败时记录错误并继续处理下一个场景', async () => {
    mockFetch([], async (sceneId) => (sceneId === 'start' ? errorResponse(500, { error: 'TTS 挂了' }) : okResponse()));

    render(
      <AudiobookGenerationCard
        gameId="1"
        game={makeGame(['start', 'end'])}
      />,
    );
    fireEvent.click(screen.getByText('一键生成有声书'));
    await vi.waitFor(() => expect(screen.getByText(/0 \/ 2 个场景已生成/)).toBeInTheDocument());
    fireEvent.click(screen.getByText('开始生成'));

    await vi.waitFor(() => expect(screen.getByText(/1 个失败/)).toBeInTheDocument());
    expect(screen.getByText('TTS 挂了')).toBeInTheDocument();
    expect(postCalls()).toHaveLength(2);
  });

  it('点击"取消剩余"后不再调用后续场景的接口', async () => {
    let resolveFirst: (value: Response) => void = () => {};
    mockFetch(
      [],
      () =>
        new Promise((resolve) => {
          resolveFirst = resolve;
        }),
    );

    render(
      <AudiobookGenerationCard
        gameId="1"
        game={makeGame(['start', 'end', 'third'])}
      />,
    );
    fireEvent.click(screen.getByText('一键生成有声书'));
    await vi.waitFor(() => expect(screen.getByText(/0 \/ 3 个场景已生成/)).toBeInTheDocument());
    fireEvent.click(screen.getByText('开始生成'));

    await vi.waitFor(() => expect(screen.getByText('取消剩余')).toBeInTheDocument());
    fireEvent.click(screen.getByText('取消剩余'));
    resolveFirst(okResponse());

    await vi.waitFor(() => expect(screen.getByText(/1 \/ 3 个场景已生成/)).toBeInTheDocument());
    expect(postCalls()).toHaveLength(1);
  });

  it('点击某一行的重新生成，只重新调用这一个场景的接口', async () => {
    mockFetch(['start', 'end']);

    render(
      <AudiobookGenerationCard
        gameId="1"
        game={makeGame(['start', 'end'])}
      />,
    );
    fireEvent.click(screen.getByText('一键生成有声书'));
    await vi.waitFor(() => expect(screen.getByText(/2 \/ 2 个场景已生成/)).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText('重新生成场景 start'));

    await vi.waitFor(() => expect(postCalls()).toHaveLength(1));
    expect(postCalls()[0]).toEqual([
      '/api/cms/games/1/audiobook/generate-scene',
      expect.objectContaining({ body: JSON.stringify({ sceneId: 'start' }) }),
    ]);
  });

  it('单场景重新生成进行中时，关闭按钮和其它行的重新生成按钮都不可用', async () => {
    let resolveRegenerate: (value: Response) => void = () => {};
    mockFetch(
      ['start', 'end'],
      () =>
        new Promise((resolve) => {
          resolveRegenerate = resolve;
        }),
    );

    render(
      <AudiobookGenerationCard
        gameId="1"
        game={makeGame(['start', 'end'])}
      />,
    );
    fireEvent.click(screen.getByText('一键生成有声书'));
    await vi.waitFor(() => expect(screen.getByText(/2 \/ 2 个场景已生成/)).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText('重新生成场景 start'));

    await vi.waitFor(() => expect(screen.queryByLabelText('重新生成场景 end')).not.toBeInTheDocument());
    expect(screen.queryByLabelText('关闭')).not.toBeInTheDocument();

    resolveRegenerate(okResponse());
    await vi.waitFor(() => expect(screen.getByLabelText('重新生成场景 end')).toBeInTheDocument());
  });

  it('生成过程中隐藏关闭按钮，完成后可以关闭弹窗', async () => {
    mockFetch([]);

    render(
      <AudiobookGenerationCard
        gameId="1"
        game={makeGame(['start'])}
      />,
    );
    fireEvent.click(screen.getByText('一键生成有声书'));

    const dialog = screen.getByRole('dialog');
    await vi.waitFor(() => expect(within(dialog).getByText(/0 \/ 1 个场景已生成/)).toBeInTheDocument());
    fireEvent.click(within(dialog).getByText('开始生成'));

    expect(screen.queryByLabelText('关闭')).not.toBeInTheDocument();

    await vi.waitFor(() => expect(screen.getByText(/1 \/ 1 个场景已生成/)).toBeInTheDocument());
    fireEvent.click(screen.getByText('关闭'));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
